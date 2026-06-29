"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "primary" | "warning";
  badge?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  badge,
}: KpiCardProps) {
  const isPrimary = variant === "primary";
  const isWarning = variant === "warning";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        isPrimary && "bg-blue-600 text-white shadow-blue-200 shadow-md",
        isWarning && "bg-white border border-amber-100",
        !isPrimary && !isWarning && "bg-white"
      )}
    >
      {/* Decoração de fundo no card primário */}
      {isPrimary && (
        <>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 h-32 w-32 rounded-full bg-white/5" />
        </>
      )}

      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-widest mb-1",
                isPrimary ? "text-blue-200" : "text-slate-500"
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                "text-3xl font-bold tracking-tight leading-none mb-1",
                isPrimary ? "text-white" : "text-slate-900"
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p
                className={cn(
                  "text-xs mt-1",
                  isPrimary ? "text-blue-200" : "text-slate-500"
                )}
              >
                {subtitle}
              </p>
            )}
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-2 text-xs font-medium",
                  trend.value >= 0
                    ? isPrimary ? "text-emerald-300" : "text-emerald-600"
                    : isPrimary ? "text-red-300" : "text-red-500"
                )}
              >
                {trend.value >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}% {trend.label}
                </span>
              </div>
            )}
          </div>

          {/* Ícone */}
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ml-3",
              isPrimary ? "bg-white/20" : isWarning ? "bg-amber-50" : "bg-blue-50"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isPrimary ? "text-white" : isWarning ? "text-amber-500" : "text-blue-600"
              )}
            />
          </div>
        </div>

        {/* Badge de urgência */}
        {badge && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-100 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
              {badge}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
