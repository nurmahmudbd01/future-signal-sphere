
import { ChartLineUp } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <ChartLineUp className="h-6 w-6" />
            <span className="font-semibold">Future Trade Signals</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Future Trade Signals. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
