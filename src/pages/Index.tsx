import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share, MoreVertical, PlusSquare, Download } from "lucide-react";
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
        <div className="text-center space-y-8 max-w-2xl mx-auto min-h-[40vh] flex flex-col justify-center">
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
          </div>
        </div>

        {/* PWA Installation Guide */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Installer appen på din telefon
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Få rask tilgang til rutinene dine ved å legge til appen på hjemskjermen
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* iOS Guide */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">🍎</span> iPhone / iPad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <p>Åpne denne siden i <strong>Safari</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <p className="flex items-center gap-1">
                    Trykk på <Share className="h-4 w-4 inline text-primary" /> <strong>Del</strong>-knappen nederst
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <p className="flex items-center gap-1">
                    Velg <PlusSquare className="h-4 w-4 inline text-primary" /> <strong>Legg til på Hjem-skjerm</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">4</span>
                  <p>Trykk <strong>Legg til</strong> øverst til høyre</p>
                </div>
              </CardContent>
            </Card>

            {/* Android Guide */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">🤖</span> Android
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <p>Åpne denne siden i <strong>Chrome</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <p className="flex items-center gap-1">
                    Trykk på <MoreVertical className="h-4 w-4 inline text-primary" /> <strong>menyknappen</strong> (tre prikker)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <p className="flex items-center gap-1">
                    Velg <Download className="h-4 w-4 inline text-primary" /> <strong>Installer app</strong> eller <strong>Legg til på startskjerm</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">4</span>
                  <p>Bekreft ved å trykke <strong>Installer</strong></p>
                </div>
              </CardContent>
            </Card>
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
