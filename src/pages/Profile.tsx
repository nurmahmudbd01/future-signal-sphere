import { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { updateUserProfile, updateUserPassword } from "@/lib/firebase";
import { User, Settings, Lock, Mail, MapPin, Globe, Phone } from "lucide-react";

export default function Profile() {
  const { user, userProfile, subscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'security'>('profile');

  if (!user || !userProfile) {
    navigate('/auth');
    return null;
  }

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const profileData = {
      username: formData.get('username') as string,
      bio: formData.get('bio') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      location: formData.get('location') as string,
      website: formData.get('website') as string,
    };

    try {
      await updateUserProfile(user.uid, profileData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords don't match",
      });
      setIsLoading(false);
      return;
    }

    try {
      await updateUserPassword(currentPassword, newPassword);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-16 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
        {subscription?.isPremium && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h2 className="text-lg font-semibold text-green-600 mb-2">Premium Member</h2>
            <p className="text-sm text-green-600">
              Your premium access expires on{' '}
              {new Date(subscription.expiresAt!).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-3">
          <div className="space-y-2">
            <Button
              variant={activeSection === 'profile' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('profile')}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button
              variant={activeSection === 'security' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('security')}
            >
              <Lock className="mr-2 h-4 w-4" />
              Security
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-12 md:col-span-9 space-y-6">
          {activeSection === 'profile' && (
            <Card>
              <form onSubmit={handleProfileUpdate}>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile information and manage your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex">
                      <Mail className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                      <Input id="email" value={user.email || ''} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="flex">
                      <User className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                      <Input 
                        id="username" 
                        name="username" 
                        defaultValue={userProfile.username} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input 
                      id="bio" 
                      name="bio" 
                      defaultValue={userProfile.bio || ''} 
                      placeholder="Tell us about yourself"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <div className="flex">
                        <Phone className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                        <Input 
                          id="phoneNumber" 
                          name="phoneNumber" 
                          defaultValue={userProfile.phoneNumber || ''} 
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="flex">
                        <MapPin className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                        <Input 
                          id="location" 
                          name="location" 
                          defaultValue={userProfile.location || ''} 
                          placeholder="City, Country"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="flex">
                      <Globe className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                      <Input 
                        id="website" 
                        name="website" 
                        defaultValue={userProfile.website || ''} 
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Profile"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card>
              <form onSubmit={handlePasswordUpdate}>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Update your password and manage account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Change Password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
