export interface STTModel {
  id: string
  name: string
  description: string
  modelId: string
  size: string
  language: string
  type: 'transformers' | 'web-speech'
}

export const STT_MODELS: STTModel[] = [
  {
    id: 'web-speech',
    name: 'Web Speech API',
    description: 'Built-in browser speech recognition. Fast, no download required.',
    modelId: 'web-speech',
    size: '0 MB',
    language: 'multi',
    type: 'web-speech',
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    description: 'OpenAI Whisper tiny model. Lightweight and fast.',
    modelId: 'onnx-community/whisper-tiny',
    size: '~40 MB',
    language: 'multi',
    type: 'transformers',
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    description: 'OpenAI Whisper base model. Better accuracy than tiny.',
    modelId: 'onnx-community/whisper-base',
    size: '~75 MB',
    language: 'multi',
    type: 'transformers',
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    description: 'OpenAI Whisper small model. Good balance of speed and accuracy.',
    modelId: 'onnx-community/whisper-small',
    size: '~250 MB',
    language: 'multi',
    type: 'transformers',
  },
]

export const DEFAULT_MODEL_ID = 'web-speech'
