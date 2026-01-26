import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TireForm } from "@/components/inventory/TireForm";
import { useTires, TireFormData } from "@/hooks/useTires";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function AddTire() {
  const navigate = useNavigate();
  const { store } = useAuth();
  const { createTire } = useTires();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (formData: TireFormData) => {
    setLoading(true);
    try {
      await createTire(formData);
      toast({
        title: "Tire added",
        description: `${formData.brand} ${formData.model} has been added to your inventory`,
      });
      navigate("/inventory");
    } catch (error) {
      console.error("Error creating tire:", error);
      toast({
        title: "Error",
        description: "Failed to add tire. Please try again.",
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
            <h1 className="text-2xl font-bold text-foreground">Add New Tire</h1>
            <p className="text-muted-foreground mt-1">
              Add a tire to your inventory with DOT codes and stock levels
            </p>
          </div>

          {/* Form */}
          <TireForm
            onSubmit={handleSubmit}
            onCancel={() => navigate("/inventory")}
            loading={loading}
          />
        </motion.div>
      </div>
    </AppLayout>
  );
}
