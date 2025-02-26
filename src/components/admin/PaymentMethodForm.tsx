import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addDoc, collection, updateDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

const paymentMethodSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.enum(["crypto", "bkash", "local"], {
    required_error: "Please select a payment type",
  }),
  instructions: z.string().min(10, "Instructions must be detailed enough"),
  accountDetails: z.string().min(5, "Account details are required"),
  network: z.string().optional(),
  token: z.string().optional(),
  minimumAmount: z.string().optional(),
  processingTime: z.string().optional(),
  additionalDetails: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'crypto') {
    if (!data.network) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Network is required for crypto payments",
        path: ['network'],
      });
    }
    if (!data.token) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Token is required for crypto payments",
        path: ['token'],
      });
    }
  }
});

type PaymentMethodData = z.infer<typeof paymentMethodSchema> & {
  isActive: boolean;
  createdAt?: string;
  updatedAt: string;
};

type PaymentMethodFormProps = {
  editingMethod?: PaymentMethodData & { id: string };
  onSuccess: () => void;
  onCancel: () => void;
};

export function PaymentMethodForm({ editingMethod, onSuccess, onCancel }: PaymentMethodFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!auth.currentUser) {
        onCancel();
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
          toast.error("You don't have permission to modify payment methods");
          onCancel();
          return;
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        onCancel();
      }
    };

    checkAdminAccess();
  }, [onCancel]);

  const form = useForm<z.infer<typeof paymentMethodSchema>>({
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
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        throw new Error("Insufficient permissions");
      }

      const paymentMethodData: PaymentMethodData = {
        ...data,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (editingMethod) {
        const docRef = doc(db, 'paymentMethods', editingMethod.id);
        await updateDoc(docRef, paymentMethodData);
        toast.success("Payment method updated successfully");
      } else {
        const newPaymentMethod: PaymentMethodData = {
          ...paymentMethodData,
          createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, 'paymentMethods'), newPaymentMethod);
        if (!docRef.id) {
          throw new Error('Failed to create payment method');
        }
        toast.success("Payment method created successfully");
      }
      
      onSuccess();
    } catch (error: any) {
      console.error("Payment method save error:", error);
      if (error.message.includes("permission") || error.code === "permission-denied") {
        toast.error("You don't have permission to modify payment methods");
      } else {
        toast.error(error.message || "Failed to save payment method");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
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
              <FormLabel>Type *</FormLabel>
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
                  <FormLabel>Network *</FormLabel>
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
                  <FormLabel>Token *</FormLabel>
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
              <FormLabel>Payment Instructions *</FormLabel>
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
              <FormLabel>Account Details *</FormLabel>
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
