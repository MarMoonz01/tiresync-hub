import { motion } from "framer-motion";
import { Check, X, Clock, Mail, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StaffJoinRequest } from "@/hooks/useStaffRequests";
import { formatDistanceToNow } from "date-fns";

interface StaffRequestCardProps {
  request: StaffJoinRequest;
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function StaffRequestCard({
  request,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: StaffRequestCardProps) {
  const initials = request.profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  const timeAgo = formatDistanceToNow(new Date(request.requested_at), { addSuffix: true });

  return (
    <motion.div variants={itemVariants}>
      <Card className="glass-card hover:shadow-soft-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={request.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground truncate">
                  {request.profile?.full_name || "Unknown"}
                </h4>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              </div>

              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{request.profile?.email}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Requested {timeAgo}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onReject}
              disabled={isApproving || isRejecting}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={onApprove}
              disabled={isApproving || isRejecting}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
