
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Signal, SignalStatus } from "@/types/signal";

interface SignalSearchAndFilterProps {
  onSearchChange: (value: string) => void;
  onStatusFilter: (value: SignalStatus | 'all') => void;
  selectedStatus: SignalStatus | 'all';
}

export function SignalSearchAndFilter({ 
  onSearchChange, 
  onStatusFilter,
  selectedStatus 
}: SignalSearchAndFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Input
          placeholder="Search by Signal ID..."
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>
      <Select
        value={selectedStatus}
        onValueChange={(value) => onStatusFilter(value as SignalStatus | 'all')}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Signals</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
