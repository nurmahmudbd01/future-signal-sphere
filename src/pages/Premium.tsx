
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Premium() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Premium Signals</h1>
      <Tabs defaultValue="future" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="future">Future Signals</TabsTrigger>
            <TabsTrigger value="spot">Spot Signals</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="future">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center py-12 col-span-full text-muted-foreground">
              No premium signals available at the moment.
            </div>
          </div>
        </TabsContent>
        <TabsContent value="spot">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center py-12 col-span-full text-muted-foreground">
              No premium signals available at the moment.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
