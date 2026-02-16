import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Settings2, Minus, Plus } from "lucide-react";
import { Tire } from "@/hooks/useTires";
import { cn } from "@/lib/utils";

interface InventoryTableProps {
    tires: Tire[];
    onEdit: (tire: Tire) => void;
    onDelete: (tireId: string) => void;
    onQuantityChange: (dotId: string, change: number) => void;
    canEdit: boolean;
    canDelete: boolean;
}

export function InventoryTable({
    tires,
    onEdit,
    onDelete,
    onQuantityChange,
    canEdit,
    canDelete
}: InventoryTableProps) {

    const getStockStatus = (quantity: number) => {
        if (quantity === 0) return { label: "Out of Stock", color: "bg-destructive/10 text-destructive" };
        if (quantity <= 4) return { label: "Low Stock", color: "bg-warning/10 text-warning" };
        return { label: "In Stock", color: "bg-success/10 text-success" };
    };

    return (
        <div className="rounded-lg border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[280px]">
                            Product
                            <span className="ml-2 text-[10px] text-muted-foreground font-normal">(Newest First)</span>
                        </TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>DOT Codes</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tires.map((tire) => {
                        const totalQty = tire.tire_dots?.reduce((sum, dot) => sum + dot.quantity, 0) || 0;
                        const status = getStockStatus(totalQty);
                        const price = tire.price || 0;

                        return (
                            <TableRow key={tire.id} className="group hover:bg-muted/40 transition-colors">
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span className="text-base">{tire.brand} {tire.model}</span>
                                        <span className="text-xs text-muted-foreground hidden group-hover:inline-block transition-opacity">
                                            ID: {tire.id.slice(0, 8)}...
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {tire.size}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {tire.tire_dots && tire.tire_dots.length > 0 ? (
                                            tire.tire_dots.map((dot, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-[10px] h-5 px-1.5 bg-muted border-muted-foreground/20 text-muted-foreground">
                                                    {dot.dot_code} <span className="ml-1 text-foreground font-semibold">({dot.quantity})</span>
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <Badge variant="secondary" className={cn("whitespace-nowrap", status.color)}>
                                            {totalQty}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    ฿{price.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    ฿{(price * totalQty).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(tire)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(tire.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
