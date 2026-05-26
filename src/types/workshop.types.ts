export type WorkshopType = 'node_map' | 'decision_tree' | 'sorting' | 'hotspot'

export interface WorkshopContent {
  workshop_type: WorkshopType
  title: string
  instructions: string
  config: NodeMapConfig | DecisionTreeConfig | SortingConfig | HotspotConfig
}

export interface NodeMapConfig {
  background_image: string
  nodes: {
    id: string
    x_percent: number
    y_percent: number
    icon: string
    label: string
    scenario: string
    question: {
      text: string
      options: { id: string; text: string; correct?: boolean }[]
      correct_id: string
    }
  }[]
}

export interface DecisionTreeConfig {
  start_node_id: string
  nodes: Record<
    string,
    {
      id: string
      title: string
      description: string
      illustration?: string
      choices?: { id: string; label: string; next_node_id: string }[]
      outcome?: 'good' | 'bad'
      teachable_moment?: string
    }
  >
}

export interface SortingConfig {
  categories: { id: string; label: string }[]
  cards: { id: string; text: string; category_id: string }[]
}

export interface HotspotConfig {
  background_image: string
  regions: {
    id: string
    label: string
    is_incident: boolean
    points: { x: number; y: number }[]
  }[]
}
