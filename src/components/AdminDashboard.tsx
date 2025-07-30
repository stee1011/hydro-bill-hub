import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Droplets, Users, FileText, DollarSign, Plus, LogOut } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  meter_number: string;
  address: string;
}

interface Bill {
  id: string;
  customer_id: string;
  meter_number: string;
  previous_reading: number;
  current_reading: number;
  units_consumed: number;
  amount: number;
  bill_month: string;
  due_date: string;
  status: string;
  profiles: { full_name: string };
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  payment_date: string;
  status: string;
  profiles: { full_name: string };
}

interface Complaint {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_response: string;
  created_at: string;
  profiles: { full_name: string };
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  const [newBill, setNewBill] = useState({
    customer_id: '',
    meter_number: '',
    previous_reading: '',
    current_reading: '',
    bill_month: '',
    due_date: '',
  });

  const [complaintsResponse, setComplaintsResponse] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', false);
      setCustomers(customersData || []);

      // Fetch bills
      const { data: billsData } = await supabase
        .from('bills')
        .select(`
          *,
          profiles!bills_customer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      setBills(billsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          profiles!payments_customer_id_fkey(full_name)
        `)
        .order('payment_date', { ascending: false });
      setPayments(paymentsData || []);

      // Fetch complaints
      const { data: complaintsData } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles!complaints_customer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      setComplaints(complaintsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBill = async () => {
    try {
      const { error } = await supabase
        .from('bills')
        .insert([{
          customer_id: newBill.customer_id,
          meter_number: newBill.meter_number,
          previous_reading: parseFloat(newBill.previous_reading),
          current_reading: parseFloat(newBill.current_reading),
          bill_month: newBill.bill_month,
          due_date: newBill.due_date,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bill created successfully",
      });
      
      setNewBill({
        customer_id: '',
        meter_number: '',
        previous_reading: '',
        current_reading: '',
        bill_month: '',
        due_date: '',
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateComplaintStatus = async (complaintId: string, status: string, response: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          status,
          admin_response: response,
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint updated successfully",
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'resolved':
        return 'default' as const;
      case 'pending':
      case 'open':
        return 'secondary' as const;
      case 'overdue':
      case 'failed':
        return 'destructive' as const;
      case 'in_progress':
        return 'outline' as const;
      default:
        return 'default' as const;
    }
  };

  const stats = {
    totalCustomers: customers.length,
    totalBills: bills.length,
    totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
    pendingComplaints: complaints.filter(c => c.status === 'open').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Droplets className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {profile?.full_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBills}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {stats.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Complaints</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingComplaints}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage all registered customers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Meter Number</TableHead>
                      <TableHead>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>{customer.full_name}</TableCell>
                        <TableCell>{customer.phone_number}</TableCell>
                        <TableCell>{customer.meter_number || 'Not assigned'}</TableCell>
                        <TableCell>{customer.address || 'Not provided'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bills">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Bill Management</CardTitle>
                  <CardDescription>Create and manage water bills</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Bill
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Bill</DialogTitle>
                      <DialogDescription>
                        Generate a new water bill for a customer
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customer">Customer</Label>
                        <Select value={newBill.customer_id} onValueChange={(value) => setNewBill(prev => ({ ...prev, customer_id: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="meter_number">Meter Number</Label>
                        <Input
                          id="meter_number"
                          value={newBill.meter_number}
                          onChange={(e) => setNewBill(prev => ({ ...prev, meter_number: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="previous_reading">Previous Reading</Label>
                        <Input
                          id="previous_reading"
                          type="number"
                          value={newBill.previous_reading}
                          onChange={(e) => setNewBill(prev => ({ ...prev, previous_reading: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="current_reading">Current Reading</Label>
                        <Input
                          id="current_reading"
                          type="number"
                          value={newBill.current_reading}
                          onChange={(e) => setNewBill(prev => ({ ...prev, current_reading: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bill_month">Bill Month</Label>
                        <Input
                          id="bill_month"
                          value={newBill.bill_month}
                          placeholder="e.g., January 2024"
                          onChange={(e) => setNewBill(prev => ({ ...prev, bill_month: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="due_date">Due Date</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={newBill.due_date}
                          onChange={(e) => setNewBill(prev => ({ ...prev, due_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={createBill}>Create Bill</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Meter</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.profiles.full_name}</TableCell>
                        <TableCell>{bill.meter_number}</TableCell>
                        <TableCell>{bill.bill_month}</TableCell>
                        <TableCell>{bill.units_consumed}</TableCell>
                        <TableCell>KSh {bill.amount}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(bill.status)}>
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View all customer payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.profiles.full_name}</TableCell>
                        <TableCell>KSh {payment.amount}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                        <TableCell>{payment.transaction_id || 'N/A'}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complaints">
            <Card>
              <CardHeader>
                <CardTitle>Customer Complaints</CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complaints.map((complaint) => (
                    <Card key={complaint.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{complaint.subject}</CardTitle>
                            <CardDescription>
                              From: {complaint.profiles.full_name} • {new Date(complaint.created_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant={getStatusBadgeVariant(complaint.status)}>
                              {complaint.status}
                            </Badge>
                            <Badge variant="outline">
                              {complaint.priority}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4">{complaint.description}</p>
                        {complaint.admin_response && (
                          <div className="mb-4 p-3 bg-muted rounded-lg">
                            <strong>Admin Response:</strong>
                            <p className="mt-1">{complaint.admin_response}</p>
                          </div>
                        )}
                        {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Write your response..."
                              value={complaintsResponse[complaint.id] || ''}
                              onChange={(e) => setComplaintsResponse(prev => ({
                                ...prev,
                                [complaint.id]: e.target.value
                              }))}
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => updateComplaintStatus(complaint.id, 'in_progress', complaintsResponse[complaint.id] || '')}
                              >
                                Mark In Progress
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateComplaintStatus(complaint.id, 'resolved', complaintsResponse[complaint.id] || '')}
                              >
                                Mark Resolved
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}