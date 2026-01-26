import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tire, TireFormData } from "@/hooks/useTires";

interface TireFormProps {
  tire?: Tire | null;
  onSubmit: (data: TireFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const emptyDot = { dot_code: "", quantity: "0", promotion: "" };

export function TireForm({ tire, onSubmit, onCancel, loading }: TireFormProps) {
  const [formData, setFormData] = useState<TireFormData>({
    size: "",
    brand: "",
    model: "",
    load_index: "",
    speed_rating: "",
    price: "",
    network_price: "",
    is_shared: false,
    dots: [{ ...emptyDot }],
  });

  useEffect(() => {
    if (tire) {
      setFormData({
        size: tire.size,
        brand: tire.brand,
        model: tire.model || "",
        load_index: tire.load_index || "",
        speed_rating: tire.speed_rating || "",
        price: tire.price?.toString() || "",
        network_price: tire.network_price?.toString() || "",
        is_shared: tire.is_shared,
        dots: tire.tire_dots?.length 
          ? tire.tire_dots.map((d) => ({
              dot_code: d.dot_code,
              quantity: d.quantity.toString(),
              promotion: d.promotion || "",
            }))
          : [{ ...emptyDot }],
      });
    }
  }, [tire]);

  const handleChange = (field: keyof TireFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDotChange = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      dots: prev.dots.map((dot, i) =>
        i === index ? { ...dot, [field]: value } : dot
      ),
    }));
  };

  const addDot = () => {
    if (formData.dots.length < 4) {
      setFormData((prev) => ({
        ...prev,
        dots: [...prev.dots, { ...emptyDot }],
      }));
    }
  };

  const removeDot = (index: number) => {
    if (formData.dots.length > 1) {
      setFormData((prev) => ({
        ...prev,
        dots: prev.dots.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const isValid = formData.size.trim() && formData.brand.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Tire Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size *</Label>
              <Input
                id="size"
                placeholder="e.g. 205/55R16"
                value={formData.size}
                onChange={(e) => handleChange("size", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                placeholder="e.g. Michelin"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="e.g. Pilot Sport 5"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="load_index">Load Index</Label>
                <Input
                  id="load_index"
                  placeholder="e.g. 91"
                  value={formData.load_index}
                  onChange={(e) => handleChange("load_index", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speed_rating">Speed Rating</Label>
                <Input
                  id="speed_rating"
                  placeholder="e.g. V"
                  value={formData.speed_rating}
                  onChange={(e) => handleChange("speed_rating", e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Pricing & Sharing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (฿)</Label>
              <Input
                id="price"
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="network_price">Network Price (฿)</Label>
              <Input
                id="network_price"
                type="number"
                placeholder="0"
                value={formData.network_price}
                onChange={(e) => handleChange("network_price", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="is_shared" className="font-medium">
                Share to Network
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Make this tire visible to other stores in the network
              </p>
            </div>
            <Switch
              id="is_shared"
              checked={formData.is_shared}
              onCheckedChange={(checked) => handleChange("is_shared", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* DOT Codes */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">DOT Codes & Stock</CardTitle>
          {formData.dots.length < 4 && (
            <Button type="button" variant="outline" size="sm" onClick={addDot}>
              <Plus className="w-4 h-4 mr-1" />
              Add DOT
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.dots.map((dot, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-muted/30 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  DOT Code {index + 1}
                </span>
                {formData.dots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeDot(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>DOT Code</Label>
                  <Input
                    placeholder="e.g. 2024"
                    value={dot.dot_code}
                    onChange={(e) =>
                      handleDotChange(index, "dot_code", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={dot.quantity}
                    onChange={(e) =>
                      handleDotChange(index, "quantity", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Promotion</Label>
                  <Input
                    placeholder="Optional"
                    value={dot.promotion}
                    onChange={(e) =>
                      handleDotChange(index, "promotion", e.target.value)
                    }
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isValid || loading}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {tire ? "Update Tire" : "Add Tire"}
        </Button>
      </div>
    </form>
  );
}
