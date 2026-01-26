import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  ArrowRight,
  Table,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTires, TireFormData } from "@/hooks/useTires";
import { useToast } from "@/hooks/use-toast";
import { 
  parseExcelFile, 
  applyMapping, 
  ParseResult, 
  ColumnMapping,
  ParsedTireRow 
} from "@/lib/excelParser";

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

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

export default function Import() {
  const { store } = useAuth();
  const { createTire } = useTires();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [parsedTires, setParsedTires] = useState<ParsedTireRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

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
      handleFile(files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (selectedFile: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    try {
      const result = await parseExcelFile(selectedFile);
      setParseResult(result);
      setMapping(result.suggestedMapping);
      setStep("mapping");
      toast({
        title: "File parsed",
        description: `Found ${result.rows.length} rows`,
      });
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Parse error",
        description: "Failed to parse the Excel file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    if (mapping) {
      setMapping({
        ...mapping,
        [field]: value === "none" ? null : value,
      });
    }
  };

  const proceedToPreview = () => {
    if (!parseResult || !mapping) return;

    const tires = applyMapping(parseResult.rows, mapping);
    // Filter out rows without required fields
    const validTires = tires.filter((t) => t.size && t.brand);
    setParsedTires(validTires);
    setStep("preview");
  };

  const startImport = async () => {
    if (!parsedTires.length) return;

    setStep("importing");
    setImporting(true);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < parsedTires.length; i++) {
      const tire = parsedTires[i];
      try {
        const formData: TireFormData = {
          size: tire.size,
          brand: tire.brand,
          model: tire.model,
          load_index: tire.load_index,
          speed_rating: tire.speed_rating,
          price: tire.price,
          network_price: "",
          is_shared: false,
          dots: tire.dots,
        };

        await createTire(formData);
        success++;
      } catch (error) {
        console.error("Error importing tire:", error);
        failed++;
      }

      setImportProgress(((i + 1) / parsedTires.length) * 100);
      setImportResults({ success, failed });
    }

    setImporting(false);
    setStep("complete");
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
          className="space-y-6 max-w-4xl mx-auto"
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

          {/* Progress Steps */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-2">
              {["Upload", "Map Columns", "Preview", "Import"].map((label, idx) => {
                const stepIdx = ["upload", "mapping", "preview", "importing"].indexOf(step);
                const isComplete = idx < stepIdx || step === "complete";
                const isCurrent = idx === stepIdx;

                return (
                  <div key={label} className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${isComplete ? "bg-success text-success-foreground" : 
                        isCurrent ? "bg-primary text-primary-foreground" : 
                        "bg-muted text-muted-foreground"}
                    `}>
                      {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`ml-2 text-sm hidden md:inline ${isCurrent ? "font-medium" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                    {idx < 3 && (
                      <div className={`w-8 md:w-16 h-0.5 mx-2 ${isComplete ? "bg-success" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`
                        relative border-2 border-dashed rounded-xl p-12 text-center transition-colors
                        ${isDragging 
                          ? "border-primary bg-primary/5" 
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
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-lg">Drop your Excel file here</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse (XLSX, XLS, CSV)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Expected Format */}
                <Card className="glass-card mt-6">
                  <CardHeader>
                    <CardTitle className="text-base">Expected Format</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <p className="text-muted-foreground">
                        Your Excel file should contain columns like:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {["Size", "ยี่ห้อยาง (Brand)", "Model", "Load Index", "Price", "DOT 1", "จำนวน 1", "โปรโมชั่น 1"].map((col) => (
                          <div key={col} className="px-3 py-2 bg-muted/50 rounded-lg text-center text-xs">
                            {col}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground">
                          Up to 4 DOT codes per tire are supported. Column names are auto-detected.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === "mapping" && parseResult && mapping && (
              <motion.div
                key="mapping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Table className="w-4 h-4" />
                      Map Columns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-6">
                      We auto-detected your columns. Adjust if needed:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Required Fields */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Required Fields</h4>
                        <MappingSelect
                          label="Size"
                          value={mapping.size}
                          options={parseResult.headers}
                          onChange={(v) => handleMappingChange("size", v)}
                          required
                        />
                        <MappingSelect
                          label="Brand"
                          value={mapping.brand}
                          options={parseResult.headers}
                          onChange={(v) => handleMappingChange("brand", v)}
                          required
                        />
                      </div>

                      {/* Optional Fields */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Optional Fields</h4>
                        <MappingSelect
                          label="Model"
                          value={mapping.model}
                          options={parseResult.headers}
                          onChange={(v) => handleMappingChange("model", v)}
                        />
                        <MappingSelect
                          label="Load Index"
                          value={mapping.load_index}
                          options={parseResult.headers}
                          onChange={(v) => handleMappingChange("load_index", v)}
                        />
                        <MappingSelect
                          label="Price"
                          value={mapping.price}
                          options={parseResult.headers}
                          onChange={(v) => handleMappingChange("price", v)}
                        />
                      </div>
                    </div>

                    {/* DOT Mappings */}
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium text-sm mb-4">DOT Code Mappings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((n) => (
                          <div key={n} className="p-4 bg-muted/30 rounded-lg space-y-3">
                            <span className="text-sm font-medium">DOT {n}</span>
                            <MappingSelect
                              label="DOT Code"
                              value={mapping[`dot${n}` as keyof ColumnMapping]}
                              options={parseResult.headers}
                              onChange={(v) => handleMappingChange(`dot${n}` as keyof ColumnMapping, v)}
                            />
                            <MappingSelect
                              label="Quantity"
                              value={mapping[`qty${n}` as keyof ColumnMapping]}
                              options={parseResult.headers}
                              onChange={(v) => handleMappingChange(`qty${n}` as keyof ColumnMapping, v)}
                            />
                            <MappingSelect
                              label="Promotion"
                              value={mapping[`promo${n}` as keyof ColumnMapping]}
                              options={parseResult.headers}
                              onChange={(v) => handleMappingChange(`promo${n}` as keyof ColumnMapping, v)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); }}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={proceedToPreview}
                    disabled={!mapping.size || !mapping.brand}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    Preview Import
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Preview ({parsedTires.length} tires to import)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <UITable>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Size</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>DOT Codes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedTires.slice(0, 10).map((tire, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{tire.size}</TableCell>
                              <TableCell>{tire.brand}</TableCell>
                              <TableCell>{tire.model || "-"}</TableCell>
                              <TableCell>{tire.price ? `฿${tire.price}` : "-"}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {tire.dots.filter(d => d.dot_code).map((dot, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {dot.dot_code} ({dot.quantity})
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </UITable>
                      {parsedTires.length > 10 && (
                        <p className="text-sm text-muted-foreground mt-4 text-center">
                          ... and {parsedTires.length - 10} more tires
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep("mapping")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={startImport}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import {parsedTires.length} Tires
                  </Button>
                </div>
              </motion.div>
            )}

            {(step === "importing" || step === "complete") && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="glass-card">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center text-center">
                      {step === "importing" ? (
                        <>
                          <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
                          <h2 className="text-xl font-semibold mb-2">Importing Tires...</h2>
                          <p className="text-muted-foreground mb-6">
                            {importResults.success + importResults.failed} of {parsedTires.length} processed
                          </p>
                          <div className="w-full max-w-md">
                            <Progress value={importProgress} className="h-2" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-8 h-8 text-success" />
                          </div>
                          <h2 className="text-xl font-semibold mb-2">Import Complete!</h2>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle2 className="w-4 h-4" />
                              {importResults.success} imported
                            </div>
                            {importResults.failed > 0 && (
                              <div className="flex items-center gap-2 text-destructive">
                                <XCircle className="w-4 h-4" />
                                {importResults.failed} failed
                              </div>
                            )}
                          </div>
                          <Button 
                            onClick={() => navigate("/inventory")}
                            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          >
                            View Inventory
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppLayout>
  );
}

interface MappingSelectProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
}

function MappingSelect({ label, value, options, onChange, required }: MappingSelectProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-24 flex-shrink-0">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </span>
      <Select value={value || "none"} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- Not mapped --</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Check className="w-4 h-4 text-success flex-shrink-0" />
      )}
    </div>
  );
}
