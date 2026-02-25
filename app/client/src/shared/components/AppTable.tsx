import type { ReactElement, TableHTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

type AppTableProps = TableHTMLAttributes<HTMLTableElement>

type AppTableComponent = ((props: AppTableProps) => ReactElement) & {
  Thead: typeof TableHeader
  Tbody: typeof TableBody
  Tr: typeof TableRow
  Th: typeof TableHead
  Td: typeof TableCell
}

const AppTableBase = ({ className, ...props }: AppTableProps) => {
  return (
    <Table
      {...props}
      className={cn(
        'app-table',
        className,
      )}
    />
  )
}

export const AppTable = Object.assign(AppTableBase, {
  Thead: TableHeader,
  Tbody: TableBody,
  Tr: TableRow,
  Th: TableHead,
  Td: TableCell,
}) as AppTableComponent
