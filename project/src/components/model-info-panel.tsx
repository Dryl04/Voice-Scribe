import { STT_MODELS } from '@/lib/stt-models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, HardDrive } from 'lucide-react'

interface ModelInfoPanelProps {
  modelId: string
}

export function ModelInfoPanel({ modelId }: ModelInfoPanelProps) {
  const model = STT_MODELS.find((m) => m.id === modelId)
  if (!model) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{model.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{model.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <HardDrive className="size-2.5" />
            {model.size}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Globe className="size-2.5" />
            {model.language === 'multi' ? 'Multilingual' : model.language}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {model.type === 'web-speech' ? 'Browser API' : 'Local AI'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
