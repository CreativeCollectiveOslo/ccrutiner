import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Sun, CloudRain, Moon, Coffee, Loader2 } from "lucide-react";

interface Shift {
  id: string;
  name: string;
  color_code: string;
}

interface Routine {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  order_index: number;
  multimedia_url: string | null;
}

interface TaskCompletion {
  routine_id: string;
}

const shiftIcons = {
  Morgen: Sun,
  Eftermiddag: CloudRain,
  Aften: Moon,
};

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchShifts();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedShift) {
      fetchRoutines();
      fetchTodayCompletions();
    }
  }, [selectedShift]);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Kunne ikke hente vagter");
      console.error(error);
    } else if (data) {
      setShifts(data);
    }
    setLoading(false);
  };

  const fetchRoutines = async () => {
    if (!selectedShift) return;

    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("shift_id", selectedShift.id)
      .order("priority", { ascending: false })
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente rutiner");
      console.error(error);
    } else if (data) {
      setRoutines(data);
    }
  };

  const fetchTodayCompletions = async () => {
    if (!user || !selectedShift) return;

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("task_completions")
      .select("routine_id")
      .eq("user_id", user.id)
      .eq("shift_date", today);

    if (error) {
      console.error(error);
    } else if (data) {
      setCompletions(new Set(data.map((c: TaskCompletion) => c.routine_id)));
    }
  };

  const toggleTaskCompletion = async (routineId: string) => {
    if (!user) return;

    const isCompleted = completions.has(routineId);
    const today = new Date().toISOString().split("T")[0];

    if (isCompleted) {
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("routine_id", routineId)
        .eq("user_id", user.id)
        .eq("shift_date", today);

      if (error) {
        toast.error("Kunne ikke opdatere opgave");
        console.error(error);
      } else {
        const newCompletions = new Set(completions);
        newCompletions.delete(routineId);
        setCompletions(newCompletions);
      }
    } else {
      const { error } = await supabase.from("task_completions").insert({
        routine_id: routineId,
        user_id: user.id,
        shift_date: today,
      });

      if (error) {
        toast.error("Kunne ikke opdatere opgave");
        console.error(error);
      } else {
        const newCompletions = new Set(completions);
        newCompletions.add(routineId);
        setCompletions(newCompletions);
      }
    }
  };

  const getShiftColorClass = (colorCode: string) => {
    if (colorCode.includes("38")) return "bg-shift-morning";
    if (colorCode.includes("210")) return "bg-shift-afternoon";
    if (colorCode.includes("270")) return "bg-shift-evening";
    return "bg-primary";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Coffee className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Mine Rutiner</h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Log ud
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {!selectedShift ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Vælg din vagt</h2>
              <p className="text-muted-foreground">
                Vælg hvilken vagt du har i dag
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {shifts.map((shift) => {
                const Icon = shiftIcons[shift.name as keyof typeof shiftIcons] || Sun;
                return (
                  <Card
                    key={shift.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                    onClick={() => setSelectedShift(shift)}
                  >
                    <CardHeader className="text-center">
                      <div
                        className={`mx-auto w-16 h-16 rounded-full ${getShiftColorClass(
                          shift.color_code
                        )} flex items-center justify-center mb-4`}
                      >
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle>{shift.name}</CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => setSelectedShift(null)}>
                  ← Tilbage
                </Button>
                <div>
                  <h2 className="text-2xl font-bold">{selectedShift.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {completions.size} af {routines.length} opgaver fuldført
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {routines.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">
                      Ingen rutiner for denne vagt endnu
                    </p>
                  </CardContent>
                </Card>
              ) : (
                routines.map((routine) => {
                  const isCompleted = completions.has(routine.id);
                  return (
                    <Card
                      key={routine.id}
                      className={`transition-all ${
                        isCompleted ? "opacity-60" : ""
                      }`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            id={routine.id}
                            checked={isCompleted}
                            onCheckedChange={() => toggleTaskCompletion(routine.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <label
                              htmlFor={routine.id}
                              className={`font-medium cursor-pointer ${
                                isCompleted ? "line-through" : ""
                              }`}
                            >
                              {routine.title}
                            </label>
                            {routine.description && (
                              <p className="text-sm text-muted-foreground">
                                {routine.description}
                              </p>
                            )}
                            {routine.priority > 0 && (
                              <Badge variant="secondary">
                                Prioritet: {routine.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
