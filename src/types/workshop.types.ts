export type WorkshopType = 'node_map' | 'decision_tree' | 'sorting' | 'hotspot'

export interface WorkshopContent {
  workshop_type: WorkshopType
  title: string
  instructions: string
  config: NodeMapConfig | DecisionTreeConfig | SortingConfig | HotspotConfig
}

export interface NodeMapConfig {
  background_image: string
  /** Built-in floor plan when background_image is empty. Defaults to ward layout. */
  floor_plan?: 'ward' | 'server_room'
  /** Minimum score (0–100) to mark module as passed. Default 60. */
  passing_score?: number
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

export interface SortingCategoryGuide {
  summary: string
  /** Module index in course to review (0 = first lesson, etc.) */
  review_module_index?: number
}

export interface SortingCard {
  id: string
  text: string
  category_id: string
  /** Shown when the learner sorts this card incorrectly */
  hint?: string
}

export interface SortingConfig {
  categories: { id: string; label: string }[]
  cards: SortingCard[]
  /** Quick reference per category for memory refresh */
  category_guides?: Record<string, SortingCategoryGuide>
  passing_score?: number
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
