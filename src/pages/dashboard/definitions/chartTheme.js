// Shared Recharts styling for the dashboards - the panel's teal/slate palette.
export const CHART_COLORS = {
  teal: "#14b8a6",
  slate: "#94a3b8",
  sky: "#0ea5e9",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  orange: "#f97316",
  emerald: "#10b981",
  rose: "#f43f5e",
  grid: "#f1f5f9",
  axis: "#94a3b8",
};

// Slices of donut charts, in order.
export const SERIES_COLORS = ["#14b8a6", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e", "#10b981", "#94a3b8"];

// Booking status -> chart colour (matches BOOKING_STATUS_META's dots).
export const STATUS_CHART_COLORS = {
  pending: "#f59e0b",
  accepted: "#0ea5e9",
  in_progress: "#8b5cf6",
  completed: "#f97316",
  paid: "#10b981",
  rejected: "#f43f5e",
  cancelled: "#94a3b8",
};

export const axisTick = { fill: CHART_COLORS.axis, fontSize: 12 };

export const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #f1f5f9",
  boxShadow: "0 10px 15px -3px rgb(15 23 42 / 0.08)",
  fontSize: "12px",
};
