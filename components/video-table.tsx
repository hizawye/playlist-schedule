"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDurationClock, formatShortDate } from "@/lib/format";

export interface VideoTableRow {
  videoId: string;
  title: string;
  durationSec: number;
  adjustedDurationSec: number;
  plannedDate: string | null;
  completed: boolean;
  completedAt?: string;
}

interface VideoTableProps {
  rows: VideoTableRow[];
  onToggleComplete: (videoId: string, completed: boolean) => void;
}

type StatusFilter = "all" | "remaining" | "completed";

export function VideoTable({ rows, onToggleComplete }: VideoTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filteredRows = useMemo(() => {
    if (status === "all") {
      return rows;
    }
    if (status === "completed") {
      return rows.filter((row) => row.completed);
    }
    return rows.filter((row) => !row.completed);
  }, [rows, status]);

  const columns = useMemo<ColumnDef<VideoTableRow>[]>(
    () => [
      {
        accessorKey: "completed",
        header: "Done",
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.completed}
            onCheckedChange={(value) =>
              onToggleComplete(row.original.videoId, Boolean(value))
            }
            aria-label={`Toggle completion for ${row.original.title}`}
          />
        ),
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[340px] space-y-1 whitespace-normal">
            <Link
              href={`https://www.youtube.com/watch?v=${row.original.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary text-sm leading-6 transition-colors"
            >
              {row.original.title}
            </Link>
            <div className="text-muted-foreground text-xs">{row.original.videoId}</div>
          </div>
        ),
      },
      {
        accessorKey: "durationSec",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Duration
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{formatDurationClock(row.original.durationSec)}</span>
        ),
      },
      {
        accessorKey: "adjustedDurationSec",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Watch Time
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {formatDurationClock(row.original.adjustedDurationSec)}
          </span>
        ),
      },
      {
        accessorKey: "plannedDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Planned Day
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) =>
          row.original.plannedDate ? (
            <span>{formatShortDate(row.original.plannedDate)}</span>
          ) : (
            <Badge variant="secondary">Complete</Badge>
          ),
      },
      {
        accessorKey: "completedAt",
        header: "Completed At",
        cell: ({ row }) =>
          row.original.completedAt ? (
            <span>{formatShortDate(row.original.completedAt)}</span>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
    ],
    [onToggleComplete]
  );

  // TanStack Table intentionally exposes dynamic table methods from this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, filterValue) => {
      const title = row.original.title.toLowerCase();
      return title.includes(String(filterValue).toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
          <Input
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search videos..."
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger className="w-full md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Videos</SelectItem>
            <SelectItem value="remaining">Remaining</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground h-20 text-center">
                No videos match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
