
import { AuthForm } from "@/components/auth/AuthForm";

export default function Auth() {
  return (
    <div className="container max-w-screen-xl mx-auto py-16 px-4">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <h1 className="text-3xl font-bold text-center mb-8">Welcome to Future Trade Signals</h1>
        <AuthForm />
      </div>
    </div>
  );
}
