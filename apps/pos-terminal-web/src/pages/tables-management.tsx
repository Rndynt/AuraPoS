import { useState, useMemo } from "react";
import { useTables } from "@/lib/api/tableHooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertCircle } from "lucide-react";
import type { Table } from "@shared/schema";

const getStatusColor = (status: string): string => {
  switch (status) {
    case "available":
      return "bg-green-100 border-green-400 text-green-800";
    case "occupied":
      return "bg-orange-100 border-orange-400 text-orange-800";
    case "reserved":
      return "bg-yellow-100 border-yellow-400 text-yellow-800";
    case "maintenance":
      return "bg-gray-100 border-gray-400 text-gray-800";
    default:
      return "bg-gray-100 border-gray-300 text-gray-700";
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-500";
    case "occupied":
      return "bg-orange-500";
    case "reserved":
      return "bg-yellow-500";
    case "maintenance":
      return "bg-gray-400";
    default:
      return "bg-gray-300";
  }
};

function TableCard({ table }: { table: Table }) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 text-center flex flex-col items-center justify-center min-h-[120px] cursor-pointer transition hover-elevate ${getStatusColor(
        table.status
      )}`}
      data-testid={`table-card-${table.tableNumber}`}
    >
      <div className="font-bold text-lg">{table.tableNumber}</div>
      <div className="text-xs mt-1 font-medium">{table.tableName || `Table ${table.tableNumber}`}</div>
      {table.currentOrderId && <div className="text-xs mt-1">Order: {(table.currentOrderId || "").slice(0, 8)}</div>}
      <div className="text-xs mt-2 opacity-75">Cap: {table.capacity || "-"}</div>
    </div>
  );
}

export default function TablesManagementPage() {
  const { data: tablesData, isLoading } = useTables();
  const [searchTerm, setSearchTerm] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const tables = tablesData?.tables || [];

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch =
        table.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (table.tableName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesFloor = floorFilter === "all" || table.floor === floorFilter;
      const matchesStatus = statusFilter === "all" || table.status === statusFilter;

      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [tables, searchTerm, floorFilter, statusFilter]);

  const floors = useMemo(() => {
    const uniqueFloors = Array.from(new Set(tables.map((t) => t.floor).filter(Boolean)));
    return uniqueFloors;
  }, [tables]);

  const statusCounts = useMemo(() => {
    return {
      available: tables.filter((t) => t.status === "available").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      reserved: tables.filter((t) => t.status === "reserved").length,
      maintenance: tables.filter((t) => t.status === "maintenance").length,
    };
  }, [tables]);

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
    <div className="flex flex-col h-full gap-4 p-6">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Floor Plan</h1>
        <p className="text-sm text-muted-foreground">Manage and organize your seating layout</p>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

        <Select value={floorFilter} onValueChange={setFloorFilter}>
          <SelectTrigger data-testid="select-floor-filter">
            <SelectValue placeholder="All Floors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Floors</SelectItem>
            {floors.map((floor) => (
              <SelectItem key={floor} value={floor} data-testid={`option-floor-${floor}`}>
                {floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="select-status-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" data-testid="button-reset-filters" onClick={() => {
          setSearchTerm("");
          setFloorFilter("all");
          setStatusFilter("all");
        }}>
          Reset Filters
        </Button>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${getStatusBadgeColor("available")}`} />
          <span className="text-sm">Free: {statusCounts.available}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${getStatusBadgeColor("reserved")}`} />
          <span className="text-sm">Reserved: {statusCounts.reserved}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${getStatusBadgeColor("occupied")}`} />
          <span className="text-sm">Checked-in: {statusCounts.occupied}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${getStatusBadgeColor("maintenance")}`} />
          <span className="text-sm">Maintenance: {statusCounts.maintenance}</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredTables.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-3">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No tables found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredTables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t pt-4 text-sm text-muted-foreground">
        <p>Showing {filteredTables.length} of {tables.length} tables</p>
      </div>
    </div>
  );
}
