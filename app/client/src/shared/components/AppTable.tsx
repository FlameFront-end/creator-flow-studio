import { Table } from '@mantine/core'
import type { TableProps } from '@mantine/core'
import type { CSSProperties, ReactElement } from 'react'

type AppTableComponent = ((props: TableProps) => ReactElement) & {
  Thead: typeof Table.Thead
  Tbody: typeof Table.Tbody
  Tr: typeof Table.Tr
  Th: typeof Table.Th
  Td: typeof Table.Td
}

const AppTableBase = ({ className, style, ...props }: TableProps) => {
  const mergedClassName = ['app-table', className].filter(Boolean).join(' ')
  const tableVars = {
    '--table-highlight-on-hover-color': 'rgba(56, 189, 248, 0.02)',
    '--table-striped-color': 'rgba(148, 163, 184, 0.02)',
  }
  const mergedStyle = {
    ...tableVars,
    ...((style as CSSProperties | undefined) ?? {}),
  } as CSSProperties

  return (
    <Table
      withTableBorder
      withColumnBorders
      striped={false}
      highlightOnHover
      {...props}
      className={mergedClassName}
      style={mergedStyle}
    />
  )
}

export const AppTable = Object.assign(AppTableBase, {
  Thead: Table.Thead,
  Tbody: Table.Tbody,
  Tr: Table.Tr,
  Th: Table.Th,
  Td: Table.Td,
}) as AppTableComponent
