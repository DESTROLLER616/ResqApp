export interface EnvironmentVariable {
  id: string
  key: string
  value: string
  secret: boolean
}

export interface Environment {
  id: string
  name: string
  variables: EnvironmentVariable[]
}

export interface EnvironmentsFile {
  version: number
  environments: Environment[]
}

export type VariableStatus = 'active' | 'other' | 'missing'

export interface VariableSpan {
  start: number
  end: number
  name: string
  status: VariableStatus
}
