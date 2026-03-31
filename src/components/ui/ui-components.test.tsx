import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('shadcn/ui components smoke tests', () => {
  it('renders Button', async () => {
    const { Button } = await import('./button');
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders Input', async () => {
    const { Input } = await import('./input');
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders Label', async () => {
    const { Label } = await import('./label');
    render(<Label>Name</Label>);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders Badge', async () => {
    const { Badge } = await import('./badge');
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders Card with subcomponents', async () => {
    const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } =
      await import('./card');
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders Table with subcomponents', async () => {
    const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } =
      await import('./table');
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders Tabs with subcomponents', async () => {
    const { Tabs, TabsList, TabsTrigger, TabsContent } = await import('./tabs');
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('renders Dialog with subcomponents', async () => {
    const { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } =
      await import('./dialog');
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByText('Dialog Description')).toBeInTheDocument();
  });

  it('renders Select with subcomponents', async () => {
    const { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } =
      await import('./select');
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders DropdownMenu with subcomponents', async () => {
    const { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } =
      await import('./dropdown-menu');
    const { Button } = await import('./button');
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole('button', { name: 'Open Menu' })).toBeInTheDocument();
  });

  it('renders Sonner Toaster', async () => {
    const { Toaster } = await import('./sonner');
    const { container } = render(<Toaster />);
    // Sonner v2 renders a toaster element as a sibling in the document body
    const toaster =
      document.querySelector('[data-sonner-toaster]') ??
      document.querySelector('ol[data-sonner-toaster]') ??
      container.firstChild;
    expect(toaster).toBeInTheDocument();
  });
});
