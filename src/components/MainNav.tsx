
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChartLineUp, Lock, Settings } from "lucide-react";
import { Button } from "./ui/button";

export function MainNav() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useState(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm border-b" : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center space-x-2 text-lg font-semibold">
          <ChartLineUp className="h-6 w-6" />
          <span>Future Trade Signals</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/premium">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Premium</span>
            </Button>
          </Link>
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
