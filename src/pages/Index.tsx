import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
            Log ind
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl tracking-tight">
            Håndter dine daglige rutiner
            <span className="block text-primary mt-2">med lethed</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            En simpel og effektiv måde for medarbejdere at holde styr på dagens opgaver,
            mens ejeren nemt kan administrere og tildele rutiner.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Kom i gang
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Log ind
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl">Enkel afkrydsning</h3>
              <p className="text-muted-foreground">
                Tjek opgaver af løbende gennem dagen med visuel feedback
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary/20 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl">Vagtbaseret</h3>
              <p className="text-muted-foreground">
                Se kun de rutiner der er relevante for din vagt
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-accent flex items-center justify-center">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl">Admin kontrol</h3>
              <p className="text-muted-foreground">
                Ejeren kan nemt oprette og administrere alle rutiner
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t mt-16">
        <p>Kreativitet • Samarbejde • Rutiner</p>
      </footer>
    </div>
  );
};

export default Index;
