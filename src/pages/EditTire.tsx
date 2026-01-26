import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TireForm } from "@/components/inventory/TireForm";
import { useTires, Tire, TireFormData } from "@/hooks/useTires";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function EditTire() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { store } = useAuth();
  const { tires, loading: tiresLoading, updateTire } = useTires();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tire, setTire] = useState<Tire | null>(null);

  useEffect(() => {
    if (!tiresLoading && id) {
      const found = tires.find((t) => t.id === id);
      if (found) {
        setTire(found);
      } else {
        toast({
          title: "Not found",
          description: "Tire not found",
          variant: "destructive",
        });
        navigate("/inventory");
      }
    }
  }, [tires, tiresLoading, id, navigate, toast]);

  if (!store) {
    return (
      <AppLayout>
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="text-xl font-semibold mb-2">No Store Found</h2>
            <p className="text-muted-foreground mb-6">
              Create your store profile first
            </p>
            <Link to="/store/setup">
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                Set Up Store
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (tiresLoading || !tire) {
    return (
      <AppLayout>
        <div className="page-container">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async (formData: TireFormData) => {
    if (!id) return;
    setLoading(true);
    try {
      await updateTire(id, formData);
      toast({
        title: "Tire updated",
        description: `${formData.brand} ${formData.model} has been updated`,
      });
      navigate("/inventory");
    } catch (error) {
      console.error("Error updating tire:", error);
      toast({
        title: "Error",
        description: "Failed to update tire. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Header */}
          <div>
            <Link
              to="/inventory"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Edit Tire</h1>
            <p className="text-muted-foreground mt-1">
              Update tire information and stock levels
            </p>
          </div>

          {/* Form */}
          <TireForm
            tire={tire}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/inventory")}
            loading={loading}
          />
        </motion.div>
      </div>
    </AppLayout>
  );
}
