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
import { Droplets, CreditCard, MessageSquare, LogOut, AlertCircle } from 'lucide-react';

interface Bill {
  id: string;
  meter_number: string;
  previous_reading: number;
  current_reading: number;
  units_consumed: number;
  amount: number;
  bill_month: string;
  due_date: string;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  payment_date: string;
  status: string;
}

interface Complaint {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_response: string;
  created_at: string;
}

export default function CustomerDashboard() {
  const { signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  const [paymentData, setPaymentData] = useState({
    bill_id: '',
    amount: '',
    payment_method: '',
    transaction_id: '',
  });

  const [complaintData, setComplaintData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
  });

  const [profileData, setProfileData] = useState({
    address: profile?.address || '',
    meter_number: profile?.meter_number || '',
    phone_number: profile?.phone_number || '',
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setProfileData({
        address: profile.address || '',
        meter_number: profile.meter_number || '',
        phone_number: profile.phone_number || '',
      });
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Fetch bills
      const { data: billsData } = await supabase
        .from('bills')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false });
      setBills(billsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', profile.id)
        .order('payment_date', { ascending: false });
      setPayments(paymentsData || []);

      // Fetch complaints
      const { data: complaintsData } = await supabase
        .from('complaints')
        .select('*')
        .eq('customer_id', profile.id)
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

  const makePayment = async () => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert([{
          bill_id: paymentData.bill_id,
          customer_id: profile?.id,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id,
        }]);

      if (error) throw error;

      // Update bill status to paid
      await supabase
        .from('bills')
        .update({ status: 'paid' })
        .eq('id', paymentData.bill_id);

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      
      setPaymentData({
        bill_id: '',
        amount: '',
        payment_method: '',
        transaction_id: '',
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

  const submitComplaint = async () => {
    try {
      const { error } = await supabase
        .from('complaints')
        .insert([{
          customer_id: profile?.id,
          subject: complaintData.subject,
          description: complaintData.description,
          priority: complaintData.priority,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint submitted successfully",
      });
      
      setComplaintData({
        subject: '',
        description: '',
        priority: 'medium',
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

  const updateProfileInfo = async () => {
    try {
      const { error } = await updateProfile(profileData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
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

  const pendingBills = bills.filter(bill => bill.status === 'pending');
  const totalOutstanding = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Droplets className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Water Billing Portal</h1>
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
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Bills</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBills.length}</div>
              <p className="text-xs text-muted-foreground">Unpaid bills</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {totalOutstanding.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Amount due</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meter Number</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.meter_number || 'Not assigned'}</div>
              <p className="text-xs text-muted-foreground">Your meter ID</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="bills" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bills">My Bills</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="bills">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Water Bills</CardTitle>
                  <CardDescription>View and pay your water bills</CardDescription>
                </div>
                {pendingBills.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Make Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Make Payment</DialogTitle>
                        <DialogDescription>
                          Pay your water bill using MPesa or Bank Transfer
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="bill">Select Bill</Label>
                          <Select value={paymentData.bill_id} onValueChange={(value) => {
                            setPaymentData(prev => ({ ...prev, bill_id: value }));
                            const selectedBill = bills.find(b => b.id === value);
                            if (selectedBill) {
                              setPaymentData(prev => ({ ...prev, amount: selectedBill.amount.toString() }));
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bill to pay" />
                            </SelectTrigger>
                            <SelectContent>
                              {pendingBills.map((bill) => (
                                <SelectItem key={bill.id} value={bill.id}>
                                  {bill.bill_month} - KSh {bill.amount}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                            disabled
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="payment_method">Payment Method</Label>
                          <Select value={paymentData.payment_method} onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mpesa">MPesa</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {paymentData.payment_method && paymentData.payment_method !== 'cash' && (
                          <div className="grid gap-2">
                            <Label htmlFor="transaction_id">Transaction ID</Label>
                            <Input
                              id="transaction_id"
                              placeholder="Enter transaction ID"
                              value={paymentData.transaction_id}
                              onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button onClick={makePayment}>Submit Payment</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Previous Reading</TableHead>
                      <TableHead>Current Reading</TableHead>
                      <TableHead>Units Used</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.bill_month}</TableCell>
                        <TableCell>{bill.previous_reading}</TableCell>
                        <TableCell>{bill.current_reading}</TableCell>
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
                <CardDescription>Your payment transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Support & Complaints</CardTitle>
                  <CardDescription>Submit and track your support requests</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      New Complaint
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Complaint</DialogTitle>
                      <DialogDescription>
                        Describe your issue and we'll get back to you soon
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          placeholder="Brief description of the issue"
                          value={complaintData.subject}
                          onChange={(e) => setComplaintData(prev => ({ ...prev, subject: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Provide detailed information about your issue"
                          value={complaintData.description}
                          onChange={(e) => setComplaintData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={complaintData.priority} onValueChange={(value) => setComplaintData(prev => ({ ...prev, priority: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={submitComplaint}>Submit Complaint</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                              {new Date(complaint.created_at).toLocaleDateString()}
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
                          <div className="p-3 bg-muted rounded-lg">
                            <strong>Admin Response:</strong>
                            <p className="mt-1">{complaint.admin_response}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile?.full_name}
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone_number}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter your address"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meter">Meter Number</Label>
                  <Input
                    id="meter"
                    placeholder="Enter your meter number"
                    value={profileData.meter_number}
                    onChange={(e) => setProfileData(prev => ({ ...prev, meter_number: e.target.value }))}
                  />
                </div>
                <Button onClick={updateProfileInfo}>
                  Update Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}