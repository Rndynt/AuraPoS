import { useState, useMemo } from "react";
import { useTables } from "@/lib/api/tableHooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Check } from "lucide-react";
import type { Table } from "@shared/schema";

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "border-green-500 bg-green-50";
    case "occupied":
      return "border-orange-500 bg-orange-50";
    case "reserved":
      return "border-yellow-500 bg-yellow-50";
    case "maintenance":
      return "border-gray-400 bg-gray-100";
    default:
      return "border-gray-300 bg-gray-50";
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-500 hover:bg-green-600";
    case "occupied":
      return "bg-orange-500 hover:bg-orange-600";
    case "reserved":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "maintenance":
      return "bg-gray-400 cursor-not-allowed";
    default:
      return "bg-gray-300";
  }
};

interface SeatIndicatorProps {
  capacity: number;
  position: "top" | "right" | "bottom" | "left";
}

function SeatIndicator({ capacity, position }: SeatIndicatorProps) {
  const maxSeats = Math.min(capacity, 4);
  const seats = Array.from({ length: maxSeats }, (_, i) => i);

  const positionClasses = {
    top: "absolute -top-2 left-1/2 transform -translate-x-1/2 flex gap-1",
    right: "absolute -right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1",
    bottom: "absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1",
    left: "absolute -left-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1",
  };

  return (
    <div className={positionClasses[position]}>
      {seats.map((i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-gray-400" />
      ))}
    </div>
  );
}

function TableCardNew({ table, selected, onSelect }: { table: Table; selected: boolean; onSelect: () => void }) {
  const isDisabled = table.status === "maintenance";

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`relative w-24 h-16 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition cursor-pointer disabled:cursor-not-allowed ${getStatusColor(table.status)} ${
        selected ? "ring-2 ring-offset-1 ring-blue-500" : ""
      }`}
      data-testid={`table-select-${table.tableNumber}`}
    >
      <div className="text-center">
        <div className="font-bold text-base">{table.tableNumber}</div>
        {table.status === "occupied" && <div className="text-xs text-orange-600">Checked-in</div>}
        {table.status === "reserved" && <div className="text-xs text-yellow-600">Reserved</div>}
        {table.status === "available" && <div className="text-xs text-green-600">Free</div>}
      </div>

      {/* Seat indicators */}
      <SeatIndicator capacity={table.capacity || 2} position="top" />
      <SeatIndicator capacity={table.capacity || 2} position="bottom" />
    </button>
  );
}

export default function TablesManagementPage() {
  const { data: tablesData, isLoading } = useTables();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "reserved" | "occupied">("all");

  const tables = tablesData?.tables || [];

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch =
        table.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (table.tableName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      let matchesStatus = true;
      if (statusFilter === "reserved") matchesStatus = table.status === "reserved";
      if (statusFilter === "occupied") matchesStatus = table.status === "occupied";

      return matchesSearch && matchesStatus;
    });
  }, [tables, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      reserved: tables.filter((t) => t.status === "reserved").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      free: tables.filter((t) => t.status === "available").length,
    };
  }, [tables]);

  const selectedTableData = tables.find((t) => t.id === selectedTable);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6 p-6">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Choose Tables</h1>
          <p className="text-sm text-muted-foreground">Select a table to manage reservations and check-ins</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-tables"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all"
          >
            All Tables
          </Button>
          <Button
            variant={statusFilter === "reserved" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("reserved")}
            data-testid="filter-reserved"
          >
            Reserved ({statusCounts.reserved})
          </Button>
          <Button
            variant={statusFilter === "occupied" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("occupied")}
            data-testid="filter-occupied"
          >
            Checked-in ({statusCounts.occupied})
          </Button>
        </div>

        {/* Status Legend */}
        <div className="flex gap-4 p-3 bg-muted rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50" />
            <span>Free: {statusCounts.free}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-50" />
            <span>Reserved: {statusCounts.reserved}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-orange-500 bg-orange-50" />
            <span>Checked-in: {statusCounts.occupied}</span>
          </div>
        </div>

        {/* Table Grid */}
        <div className="flex-1 overflow-auto">
          {filteredTables.length > 0 ? (
            <div className="grid gap-6 p-4 bg-muted/30 rounded-lg auto-fit" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
              {filteredTables.map((table) => (
                <div key={table.id} className="flex justify-center">
                  <TableCardNew
                    table={table}
                    selected={selectedTable === table.id}
                    onSelect={() => setSelectedTable(table.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">No tables found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Guest Information */}
      <div className="w-64 border-l pl-6 py-4 flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-auto">
        {selectedTableData ? (
          <>
            <div>
              <h2 className="font-semibold text-lg">Table {selectedTableData.tableNumber}</h2>
              <p className="text-sm text-muted-foreground">{selectedTableData.tableName}</p>
              <p className="text-xs text-muted-foreground mt-1">Capacity: {selectedTableData.capacity} persons</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusBadgeColor(selectedTableData.status)} text-white`}>
                  {selectedTableData.status.charAt(0).toUpperCase() + selectedTableData.status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              {selectedTableData.status === "occupied" && (
                <Button variant="outline" className="w-full" size="sm" data-testid="button-checkin-table">
                  <Check className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              )}
              {selectedTableData.status === "available" && (
                <Button className="w-full bg-orange-500 hover:bg-orange-600" size="sm" data-testid="button-reserve-table">
                  Reserve Table
                </Button>
              )}
              <Button variant="outline" className="w-full" size="sm" data-testid="button-view-details">
                View Details
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Select a table to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
