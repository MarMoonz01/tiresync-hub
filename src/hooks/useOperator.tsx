import { createContext, useContext, useState, ReactNode } from "react";

export interface Operator {
  id: string;
  name: string;
  role: string;
  initials: string;
}

interface OperatorCtx {
  operator: Operator | null;
  setOperator: (o: Operator | null) => void;
}

const Ctx = createContext<OperatorCtx>({ operator: null, setOperator: () => {} });
const KEY = "baanake.operator";

export function OperatorProvider({ children }: { children: ReactNode }) {
  const [operator, setOp] = useState<Operator | null>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Operator) : null;
    } catch {
      return null;
    }
  });

  const setOperator = (o: Operator | null) => {
    setOp(o);
    try {
      if (o) localStorage.setItem(KEY, JSON.stringify(o));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore storage errors */
    }
  };

  return <Ctx.Provider value={{ operator, setOperator }}>{children}</Ctx.Provider>;
}

export const useOperator = () => useContext(Ctx);
