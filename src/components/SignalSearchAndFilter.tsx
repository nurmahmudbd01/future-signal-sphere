
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignalStatus } from "@/types/signal";

export interface SignalSearchAndFilterProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  statusFilter: SignalStatus | 'all';
  onStatusFilterChange: (status: SignalStatus | 'all') => void;
}

export function SignalSearchAndFilter({
  searchQuery, 
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange
}: SignalSearchAndFilterProps) {
  return (
    <div className="flex gap-4 items-end">
      <div className="w-full max-w-[300px]">
        <Label htmlFor="search" className="sr-only">Search</Label>
        <Input
          id="search"
          placeholder="Search signals..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
        />
      </div>
      <div className="min-w-[140px]">
        <Label htmlFor="statusFilter" className="sr-only">Status</Label>
        <Select 
          value={statusFilter} 
          onValueChange={(value) => onStatusFilterChange(value as SignalStatus | 'all')}
        >
          <SelectTrigger id="statusFilter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
