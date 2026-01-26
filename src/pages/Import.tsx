import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Import() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(file);
    toast({
      title: "File uploaded",
      description: `${file.name} is ready for import`,
    });
  };

  if (!store) {
    return (
      <AppLayout>
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Store Found</h2>
            <p className="text-muted-foreground mb-6">
              Create your store profile to start importing inventory
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

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 max-w-3xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Link 
              to="/inventory" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Import from Excel</h1>
            <p className="text-muted-foreground mt-1">
              Upload your tire stock spreadsheet to bulk import inventory
            </p>
          </motion.div>

          {/* Upload Area */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card">
              <CardContent className="p-6">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
                    ${isDragging 
                      ? "border-primary bg-primary/5" 
                      : file 
                      ? "border-success bg-success/5" 
                      : "border-border hover:border-primary/50"}
                  `}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="flex flex-col items-center gap-4">
                    {file ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                          <Check className="w-8 h-8 text-success" />
                        </div>
                        <div>
                          <p className="font-medium text-success">{file.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Ready to import
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Drop your Excel file here</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse (XLSX, XLS, CSV)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Expected Format */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Expected Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Your Excel file should contain the following columns:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {["Size", "Brand (ยี่ห้อยาง)", "Model", "Load Index", "Price", "DOT 1", "จำนวน 1", "โปรโมชั่น 1", "DOT 2", "จำนวน 2", "..."].map((col) => (
                      <div key={col} className="px-3 py-2 bg-muted/50 rounded-lg text-center">
                        {col}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Up to 4 DOT codes per tire are supported, each with quantity and promotion fields.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Import Button */}
          {file && (
            <motion.div 
              variants={itemVariants}
              className="flex justify-end"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import {file.name}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
