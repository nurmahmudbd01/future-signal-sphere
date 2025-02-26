
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addDoc, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const paymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["crypto", "bkash", "local"]),
  instructions: z.string().min(1, "Instructions are required"),
  accountDetails: z.string().min(1, "Account details are required"),
  network: z.string().optional(),
  token: z.string().optional(),
  minimumAmount: z.string().optional(),
  processingTime: z.string().optional(),
  additionalDetails: z.string().optional(),
});

type PaymentMethodFormProps = {
  editingMethod?: any;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PaymentMethodForm({ editingMethod, onSuccess, onCancel }: PaymentMethodFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: editingMethod || {
      name: "",
      type: "crypto",
      instructions: "",
      accountDetails: "",
      network: "",
      token: "",
      minimumAmount: "",
      processingTime: "",
      additionalDetails: "",
    },
  });

  const paymentType = form.watch("type");

  const onSubmit = async (data: z.infer<typeof paymentMethodSchema>) => {
    setIsLoading(true);
    try {
      if (editingMethod) {
        await updateDoc(doc(db, 'paymentMethods', editingMethod.id), {
          ...data,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'paymentMethods'), {
          ...data,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      toast.success(editingMethod ? "Payment method updated" : "Payment method created");
      onSuccess();
    } catch (error) {
      toast.error("Failed to save payment method");
    }
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bitcoin Payment" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="local">Local Payment</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {paymentType === "crypto" && (
          <>
            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BEP20, ERC20, TRC20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., USDT, BTC, ETH" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Instructions</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter detailed payment instructions..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Details</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Wallet address or account number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="minimumAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Amount</FormLabel>
              <FormControl>
                <Input placeholder="e.g., $10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="processingTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Processing Time</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1-2 business days" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="additionalDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional information..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? "Saving..." : (editingMethod ? "Update Method" : "Add Method")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
