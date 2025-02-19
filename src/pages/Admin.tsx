
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function Admin() {
  return (
    <div className="container py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Signal Management</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Signal
        </Button>
      </div>
      <div className="text-center py-12 text-muted-foreground">
        No signals created yet.
      </div>
    </div>
  );
}
