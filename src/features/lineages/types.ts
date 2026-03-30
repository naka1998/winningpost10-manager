export interface Lineage {
  id: number;
  name: string;
  lineageType: 'parent' | 'child';
  parentLineageId: number | null;
  spStType: 'SP' | 'ST' | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineageCreateInput {
  name: string;
  lineageType: 'parent' | 'child';
  parentLineageId?: number | null;
  spStType?: 'SP' | 'ST' | null;
  notes?: string | null;
}

export interface LineageUpdateInput {
  name?: string;
  lineageType?: 'parent' | 'child';
  parentLineageId?: number | null;
  spStType?: 'SP' | 'ST' | null;
  notes?: string | null;
}

export interface LineageNode extends Lineage {
  children: LineageNode[];
}
