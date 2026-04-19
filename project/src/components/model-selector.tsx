import { STT_MODELS } from '@/lib/stt-models'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface ModelSelectorProps {
  modelId: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ modelId, onModelChange, disabled }: ModelSelectorProps) {
  return (
    <Select value={modelId} onValueChange={onModelChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {STT_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center gap-2">
              <span>{model.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {model.size}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
