
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { TrendingUp, Lock, Settings, LogIn, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";

export function MainNav() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm border-b" : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center space-x-2 text-lg font-semibold">
          <TrendingUp className="h-6 w-6" />
          <span>Future Trade Signals</span>
        </Link>
        <div className="flex items-center space-x-4">
          {user && userProfile ? (
            <>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{userProfile.username}</span>
              </div>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Profile</span>
                </Button>
              </Link>
              <Link to="/premium">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Premium</span>
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center space-x-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="flex items-center space-x-2">
                <LogIn className="h-4 w-4" />
                <span>Login / Register</span>
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
