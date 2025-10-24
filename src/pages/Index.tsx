import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/30 to-background">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Creative Collective" className="h-10 w-auto" />
            <h2 className="text-2xl">Creative Collective</h2>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Logg inn
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-2xl mx-auto min-h-[60vh] flex flex-col justify-center">
          <h1 className="text-5xl md:text-7xl tracking-tight">
            Se dine rutiner
            <span className="block text-primary mt-2">enkelt</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Hold oversikt over dagens oppgaver
          </p>
          <div className="flex flex-col gap-3 items-center pt-6">
            <Button size="lg" className="w-full max-w-xs" onClick={() => navigate("/auth")}>
              Logg inn
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/auth")}
            >
              Admin innlogging
            </Button>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t mt-16">
        <p>Kreativitet • Samarbeid • Rutiner</p>
      </footer>
    </div>
  );
};

export default Index;
