
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile, updateUserPassword } from "@/lib/firebase";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { CreditCard, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { user, userProfile, refreshUserProfile, subscription } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const navigate = useNavigate();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const profileData = {
        username: formData.get('username') as string,
        bio: formData.get('bio') as string,
        location: formData.get('location') as string,
        website: formData.get('website') as string,
        phoneNumber: formData.get('phoneNumber') as string,
        profileComplete: true
      };
      
      await updateUserProfile(user.uid, profileData);
      await refreshUserProfile();
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChangingPassword(true);

    try {
      const formData = new FormData(e.currentTarget);
      const currentPassword = formData.get('currentPassword') as string;
      const newPassword = formData.get('newPassword') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("All fields are required");
      }
      
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords don't match");
      }
      
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      
      await updateUserPassword(currentPassword, newPassword);
      
      // Reset the form
      e.currentTarget.reset();
      
      toast.success("Password changed successfully");
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="profile">Profile Information</TabsTrigger>
              <TabsTrigger value="password">Change Password</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                  <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <form onSubmit={handleProfileUpdate}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={user.email || ''} 
                        disabled 
                      />
                      <p className="text-xs text-muted-foreground">
                        Your email can't be changed
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username" 
                        name="username" 
                        defaultValue={userProfile?.username || ''} 
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea 
                        id="bio" 
                        name="bio" 
                        defaultValue={userProfile?.bio || ''}
                        placeholder="Tell us about yourself"
                        className="resize-none"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input 
                          id="location" 
                          name="location" 
                          defaultValue={userProfile?.location || ''}
                          placeholder="City, Country"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input 
                          id="website" 
                          name="website" 
                          defaultValue={userProfile?.website || ''}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input 
                        id="phoneNumber" 
                        name="phoneNumber" 
                        defaultValue={userProfile?.phoneNumber || ''}
                        placeholder="e.g. +1 (234) 567-8901"
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password.</CardDescription>
                </CardHeader>
                <form onSubmit={handlePasswordChange}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input 
                        id="currentPassword" 
                        name="currentPassword" 
                        type="password" 
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input 
                        id="newPassword" 
                        name="newPassword" 
                        type="password" 
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be at least 6 characters long
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        type="password" 
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>View your past payments and subscriptions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userProfile?.paymentHistory && userProfile.paymentHistory.length > 0 ? (
                    <div className="space-y-4">
                      {userProfile.paymentHistory.map((payment, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium flex items-center gap-2">
                                Payment #{payment.requestId.substring(0, 8)}
                                <Badge 
                                  variant="outline" 
                                  className={
                                    payment.status === 'approved'
                                      ? 'bg-green-50 text-green-700 hover:bg-green-50'
                                      : 'bg-red-50 text-red-700 hover:bg-red-50'
                                  }
                                >
                                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                </Badge>
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Date: {new Date(payment.date).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-lg font-bold">${payment.amount.toFixed(2)}</div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                            <p className="font-mono text-sm">{payment.transactionId}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No payment history available.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Member Since</div>
                <div>{formatDate(userProfile?.createdAt)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Account Type</div>
                <div className="flex items-center">
                  {userProfile?.role === 'admin' ? (
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
                      Admin
                    </Badge>
                  ) : subscription?.isPremium ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Free
                    </Badge>
                  )}
                </div>
              </div>
              
              {subscription?.isPremium && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Premium Expires</div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(subscription?.expiresAt)}</span>
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                {!subscription?.isPremium && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/premium')}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Upgrade to Premium
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
