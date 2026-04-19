import { STT_MODELS, type STTModel } from "./stt-models";

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type StatusCallback = (status: EngineStatus) => void;
type ProgressCallback = (progress: number) => void;
type WhisperDevice = "webgpu" | "wasm";
type WhisperDType = "fp32" | "fp16" | "q8" | "q4";
type WhisperPipelineConfig = {
  device: WhisperDevice;
  dtype:
    | WhisperDType
    | {
        encoder_model: WhisperDType;
        decoder_model_merged: WhisperDType;
      };
  label: string;
};

export type EngineStatus =
  | "idle"
  | "loading"
  | "ready"
  | "listening"
  | "processing"
  | "error";

let currentPipeline: ReturnType<typeof createWhisperPipeline> | null = null;
let loadedModelId: string | null = null;
let preferredDevicePromise: Promise<WhisperDevice> | null = null;

const DEVICE_DTYPE_CONFIGS: Record<WhisperDevice, WhisperPipelineConfig[]> = {
  webgpu: [
    {
      device: "webgpu",
      dtype: {
        encoder_model: "fp32",
        decoder_model_merged: "q4",
      },
      label: "webgpu fp32/q4",
    },
    {
      device: "webgpu",
      dtype: "fp32",
      label: "webgpu fp32",
    },
    {
      device: "wasm",
      dtype: {
        encoder_model: "fp32",
        decoder_model_merged: "q4",
      },
      label: "wasm fp32/q4",
    },
    {
      device: "wasm",
      dtype: "fp32",
      label: "wasm fp32",
    },
  ],
  wasm: [
    {
      device: "wasm",
      dtype: {
        encoder_model: "fp32",
        decoder_model_merged: "q4",
      },
      label: "wasm fp32/q4",
    },
    {
      device: "wasm",
      dtype: "fp32",
      label: "wasm fp32",
    },
    {
      device: "wasm",
      dtype: "q8",
      label: "wasm q8",
    },
  ],
};

async function getPreferredWhisperDevice(): Promise<WhisperDevice> {
  if (!preferredDevicePromise) {
    preferredDevicePromise = (async () => {
      const gpuNavigator =
        typeof navigator === "undefined"
          ? null
          : (navigator as Navigator & {
              gpu?: { requestAdapter: () => Promise<unknown> };
            });

      if (!gpuNavigator?.gpu) {
        return "wasm";
      }

      try {
        const adapter = await gpuNavigator.gpu.requestAdapter();
        return adapter ? "webgpu" : "wasm";
      } catch {
        return "wasm";
      }
    })();
  }

  return preferredDevicePromise;
}

function getModelLoadErrorMessage(model: STTModel, error: unknown) {
  if (error instanceof Error) {
    const details = error.message.trim();
    const offlineHint =
      typeof navigator !== "undefined" && !navigator.onLine
        ? " Connect once to download and cache the model before using it offline."
        : "";

    return `Failed to load model: ${model.name}. ${details}${offlineHint}`.trim();
  }

  return `Failed to load model: ${model.name}`;
}

function getWhisperConfigs(device: WhisperDevice) {
  const configs = DEVICE_DTYPE_CONFIGS[device];
  return configs;
}

async function createWhisperPipeline(
  modelId: string,
  onProgress?: ProgressCallback,
) {
  const { env, pipeline } = await import("@huggingface/transformers");
  const preferredDevice = await getPreferredWhisperDevice();

  env.useBrowserCache = true;
  env.allowLocalModels = false;

  const configs = getWhisperConfigs(preferredDevice);
  let lastError: unknown = null;

  for (const config of configs) {
    try {
      return await pipeline("automatic-speech-recognition", modelId, {
        device: config.device,
        dtype: config.dtype,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (data: any) => {
          if (data?.progress !== undefined && onProgress) {
            onProgress(data.progress);
          }
        },
      });
    } catch (error) {
      lastError = error;
      console.warn(
        `Whisper pipeline failed with ${config.label}, trying next fallback`,
        error,
      );
    }
  }

  throw lastError instanceof Error
    ? new Error(lastError.message)
    : new Error("Unable to initialize Whisper pipeline");
}

export class STTEngine {
  private model: STTModel;
  private onTranscript: TranscriptCallback;
  private onStatus: StatusCallback;
  private onProgress?: ProgressCallback;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recognition: SpeechRecognition | null = null;
  private status: EngineStatus = "idle";
  private stream: MediaStream | null = null;

  constructor(
    modelId: string,
    onTranscript: TranscriptCallback,
    onStatus: StatusCallback,
    onProgress?: ProgressCallback,
  ) {
    this.model = STT_MODELS.find((m) => m.id === modelId) ?? STT_MODELS[0];
    this.onTranscript = onTranscript;
    this.onStatus = onStatus;
    this.onProgress = onProgress;
  }

  private setStatus(status: EngineStatus) {
    this.status = status;
    this.onStatus(status);
  }

  async initialize(): Promise<void> {
    if (this.model.type === "web-speech") {
      this.setStatus("ready");
      return;
    }

    if (loadedModelId === this.model.modelId && currentPipeline) {
      this.setStatus("ready");
      return;
    }

    if (currentPipeline && loadedModelId !== this.model.modelId) {
      try {
        const prev = await currentPipeline;
        (prev as unknown as { dispose?: () => Promise<void> })?.dispose?.();
      } catch {
        // ignore
      }
      currentPipeline = null;
      loadedModelId = null;
    }

    this.setStatus("loading");
    try {
      currentPipeline = createWhisperPipeline(
        this.model.modelId,
        this.onProgress,
      );
      await currentPipeline;
      loadedModelId = this.model.modelId;
      this.setStatus("ready");
    } catch (error) {
      console.error("Whisper pipeline initialization failed", error);
      this.setStatus("error");
      throw new Error(getModelLoadErrorMessage(this.model, error));
    }
  }

  async start(): Promise<void> {
    if (this.status !== "ready") {
      await this.initialize();
    }

    if (this.model.type === "web-speech" && !STTEngine.isWebSpeechSupported()) {
      this.setStatus("error");
      throw new Error(
        "Web Speech API is not supported in this browser. Try Chrome or Edge, or select a Whisper model instead.",
      );
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (this.model.type === "web-speech") {
      this.startWebSpeech();
    } else {
      this.startWhisper(this.stream);
    }
  }

  static isWebSpeechSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  private startWebSpeech() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.setStatus("error");
      throw new Error(
        "Web Speech API is not supported in this browser. Try Chrome or Edge, or select a Whisper model instead.",
      );
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = navigator.language || "en-US";

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalText += (finalText ? " " : "") + text.trim();
        } else {
          interimText += (interimText ? " " : "") + text.trim();
        }
      }
      if (finalText) {
        this.onTranscript(finalText, true);
      }
      this.onTranscript(interimText, false);
    };

    this.recognition.onerror = () => {
      this.setStatus("error");
    };

    this.recognition.onend = () => {
      if (this.status === "listening") {
        try {
          this.recognition?.start();
        } catch {
          // ignore
        }
      }
    };

    this.recognition.start();
    this.setStatus("listening");
  }

  private startWhisper(stream: MediaStream) {
    this.audioChunks = [];
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
    ];
    const supported = candidates.find(
      (t) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported?.(t),
    );
    this.mediaRecorder = supported
      ? new MediaRecorder(stream, { mimeType: supported })
      : new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      if (this.audioChunks.length === 0) return;
      this.setStatus("processing");
      let audioContext: AudioContext | null = null;

      try {
        const blobType = this.mediaRecorder?.mimeType || "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: blobType });
        const arrayBuffer = await audioBlob.arrayBuffer();
        audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const firstChannel = audioBuffer.getChannelData(0);
        const float32 = new Float32Array(firstChannel.length);

        if (audioBuffer.numberOfChannels === 1) {
          float32.set(firstChannel);
        } else {
          for (let index = 0; index < firstChannel.length; index++) {
            let sum = 0;
            for (
              let channel = 0;
              channel < audioBuffer.numberOfChannels;
              channel++
            ) {
              sum += audioBuffer.getChannelData(channel)[index] ?? 0;
            }
            float32[index] = sum / audioBuffer.numberOfChannels;
          }
        }

        if (currentPipeline) {
          const pipe = await currentPipeline;
          const result = await (
            pipe as (input: Float32Array) => Promise<{ text: string }>
          )(float32);
          this.onTranscript(result.text.trim(), true);
        }
      } catch (error) {
        console.error("Whisper transcription failed", error);
        this.setStatus("error");
      } finally {
        await audioContext?.close().catch(() => undefined);
      }

      if (this.status === "processing") {
        this.setStatus("idle");
      }
      this.mediaRecorder = null;
    };

    this.mediaRecorder.start(5000);
    this.setStatus("listening");
  }

  stop() {
    const hasPendingWhisper =
      this.mediaRecorder !== null && this.mediaRecorder.state !== "inactive";

    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.abort();
      this.recognition = null;
    }

    if (hasPendingWhisper && this.mediaRecorder) {
      this.mediaRecorder.stop();
    } else {
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (!hasPendingWhisper && this.status !== "processing") {
      this.setStatus("idle");
    }
  }

  getStatus() {
    return this.status;
  }
}
