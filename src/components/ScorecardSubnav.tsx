import { NavLink, useSearchParams } from "react-router-dom";

type ScorecardSubnavProps = {
  className?: string;
};

const months = [
  { name: "Jan", value: 1 },
  { name: "Feb", value: 2 },
  { name: "Mar", value: 3 },
  { name: "Apr", value: 4 },
  { name: "May", value: 5 },
  { name: "Jun", value: 6 },
  { name: "Jul", value: 7 },
  { name: "Aug", value: 8 },
  { name: "Sep", value: 9 },
  { name: "Oct", value: 10 },
  { name: "Nov", value: 11 },
  { name: "Dec", value: 12 },
];

const otherTabs = [
  { name: "Employees", to: "/scorecards/employees" },
  { name: "Targets", to: "/scorecards/targets" },
  { name: "Analytics", to: "/scorecards/analytics" },
];

export default function ScorecardSubnav({ className }: ScorecardSubnavProps) {
  const [searchParams] = useSearchParams();
  const currentMonth = parseInt(searchParams.get("month") || "") || new Date().getMonth() + 1;

  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`.trim()}>
      {/* Month tabs */}
      <div className="flex flex-wrap gap-1.5">
        {months.map((m) => {
          const isActive = currentMonth === m.value;
          return (
            <NavLink
              key={m.value}
              to={`/scorecards?month=${m.value}`}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m.name}
            </NavLink>
          );
        })}
      </div>
      {/* Other tabs */}
      <div className="flex flex-wrap gap-2">
        {otherTabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            {tab.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
