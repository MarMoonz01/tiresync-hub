import { Store, Crown, Users, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStoreAssociations } from "@/hooks/useUserStoreAssociations";

export function StoreAssociationsCard() {
  const { data: associations, isLoading } = useUserStoreAssociations();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4" />
            Store Associations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!associations || associations.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4" />
            Store Associations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are not associated with any stores yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="w-4 h-4" />
          Store Associations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {associations.map((association) => (
          <div
            key={association.store_id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {association.is_owner ? (
                  <Crown className="w-5 h-5 text-warning" />
                ) : (
                  <Users className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{association.store_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Role Badge */}
                  {association.is_owner ? (
                    <Badge variant="warning">
                      <Crown className="w-3 h-3 mr-1" />
                      Owner
                    </Badge>
                  ) : (
                    <Badge variant="default">
                      <Users className="w-3 h-3 mr-1" />
                      {association.role.charAt(0).toUpperCase() + association.role.slice(1)}
                    </Badge>
                  )}
                  
                  {/* Status Badge - only for non-owners */}
                  {!association.is_owner && (
                    association.is_approved ? (
                      <Badge variant="success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>
            {/* Permission indicators */}
            {association.permissions && !association.is_owner && (
              <div className="flex gap-1">
                {association.permissions.line?.adjust && (
                  <Badge variant="outline" className="text-xs">
                    LINE Adjust
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
