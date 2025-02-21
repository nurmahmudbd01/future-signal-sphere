
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { SignalCard } from "@/components/SignalCard";
import { generateSignalId } from "@/utils/signalUtils";
import { Signal } from "@/types/signal";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  signalType: z.enum(["Buy", "Sell"]),
  marketType: z.enum(["Future", "Spot"]),
  blockchainType: z.enum(["Bitcoin", "Ethereum", "Solana", "Other"]),
  entryPrice: z.string().min(1, "Entry price is required"),
  targetPrice: z.string().min(1, "Target price is required"),
  stopLoss: z.string().min(1, "Stop loss is required"),
  displayLocation: z.enum(["Main", "Premium", "Both"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function Admin() {
  const [open, setOpen] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);

  useEffect(() => {
    const loadSignals = () => {
      const storedSignals = localStorage.getItem('signals');
      if (storedSignals) {
        const parsedSignals = JSON.parse(storedSignals);
        setSignals(parsedSignals);
      }
    };

    loadSignals();
    window.addEventListener('storage', loadSignals);
    return () => window.removeEventListener('storage', loadSignals);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editingSignal ? {
      title: editingSignal.title,
      description: editingSignal.description,
      signalType: editingSignal.signalType,
      marketType: editingSignal.marketType,
      blockchainType: editingSignal.blockchainType,
      entryPrice: editingSignal.entryPrice,
      targetPrice: editingSignal.targetPrice,
      stopLoss: editingSignal.stopLoss,
      displayLocation: editingSignal.displayLocation,
    } : {
      title: "",
      description: "",
      signalType: "Buy",
      marketType: "Future",
      blockchainType: "Bitcoin",
      entryPrice: "",
      targetPrice: "",
      stopLoss: "",
      displayLocation: "Main",
    },
  });

  function onSubmit(values: FormValues) {
    const newSignal: Signal = {
      id: editingSignal?.id || generateSignalId(),
      createdAt: editingSignal?.createdAt || new Date(),
      status: "active", // Set default status to active
      approved: true, // Set signals as approved by default
      ...values,
    };

    console.log('Creating/Updating signal:', newSignal); // Debug log

    let updatedSignals;
    if (editingSignal) {
      updatedSignals = signals.map(signal => 
        signal.id === editingSignal.id ? newSignal : signal
      );
      toast.success("Signal updated successfully!");
    } else {
      updatedSignals = [...signals, newSignal];
      toast.success("Signal created successfully!");
    }

    // Update localStorage
    localStorage.setItem('signals', JSON.stringify(updatedSignals));
    console.log('Updated signals in storage:', updatedSignals); // Debug log

    setSignals(updatedSignals);
    setOpen(false);
    form.reset();
    setEditingSignal(null);

    // Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'));
  }

  const handleEdit = (signal: Signal) => {
    setEditingSignal(signal);
    form.reset(signal);
    setOpen(true);
  };

  const handleDelete = (signalToDelete: Signal) => {
    const updatedSignals = signals.filter(signal => signal.id !== signalToDelete.id);
    setSignals(updatedSignals);
    localStorage.setItem('signals', JSON.stringify(updatedSignals));
    toast.success("Signal deleted successfully!");
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="container py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Signal Management</h1>
        <Dialog open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen);
          if (!newOpen) {
            setEditingSignal(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Signal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSignal ? "Edit Signal" : "Create New Signal"}</DialogTitle>
              <DialogDescription>
                Fill in the details below to {editingSignal ? "update the" : "create a new"} trading signal.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter signal title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter signal description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="signalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signal Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select signal type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Buy">Buy</SelectItem>
                            <SelectItem value="Sell">Sell</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="marketType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Market Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select market type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Future">Future</SelectItem>
                            <SelectItem value="Spot">Spot</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="blockchainType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blockchain</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blockchain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                          <SelectItem value="Ethereum">Ethereum</SelectItem>
                          <SelectItem value="Solana">Solana</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="entryPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.00000001" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.00000001" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stopLoss"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stop Loss</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.00000001" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="displayLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select display location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Main">Main</SelectItem>
                          <SelectItem value="Premium">Premium</SelectItem>
                          <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Create Signal</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {signals.length > 0 ? (
          signals.map((signal) => (
            <div key={signal.id} className="relative group">
              <SignalCard signal={signal} isAdmin />
              <div className="absolute top-2 right-2 hidden group-hover:flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleEdit(signal)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(signal)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 col-span-full text-muted-foreground">
            No signals created yet.
          </div>
        )}
      </div>
    </div>
  );
}
