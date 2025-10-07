export type BlockType = 'text' | 'stats' | 'table' | 'actions' | 'file' | 'form' | 'suggest'

export interface BlockBase {
  id?: string
  type: BlockType
}

export interface TextBlock extends BlockBase {
  type: 'text'
  md: string
}

export interface StatsItem {
  label: string
  value: string
  caption?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface StatsBlock extends BlockBase {
  type: 'stats'
  items: StatsItem[]
}

export interface TableBlock extends BlockBase {
  type: 'table'
  columns: string[]
  rows: (string | number | null)[][]
  footnote?: string
}

export type ActionKind = 'primary' | 'secondary' | 'ghost'

export interface ActionItem {
  id?: string
  kind?: ActionKind
  label: string
  action: string
  params?: Record<string, any>
  meta?: string
}

export interface ActionsBlock extends BlockBase {
  type: 'actions'
  items: ActionItem[]
}

export interface FileItem {
  id?: string
  name: string
  description?: string
  meta?: string
  action?: ActionItem
}

export interface FileBlock extends BlockBase {
  type: 'file'
  files: FileItem[]
}

export type FormFieldType = 'text' | 'number' | 'email' | 'tel' | 'select'

export interface FormFieldOption {
  label: string
  value: string
}

export interface FormField {
  id: string
  label: string
  placeholder?: string
  type?: FormFieldType
  value?: string
  options?: FormFieldOption[]
  required?: boolean
}

export interface FormBlock extends BlockBase {
  type: 'form'
  title?: string
  description?: string
  fields: FormField[]
  submit: ActionItem
}

export interface SuggestBlock extends BlockBase {
  type: 'suggest'
  chips: string[]
}

export type Block =
  | TextBlock
  | StatsBlock
  | TableBlock
  | ActionsBlock
  | FileBlock
  | FormBlock
  | SuggestBlock

export interface BlockRendererHandlers {
  onAction?: (item: ActionItem) => void
  onSuggest?: (chip: string) => void
}

