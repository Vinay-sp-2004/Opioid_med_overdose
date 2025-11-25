import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { UserIcon, Save, Mail, Phone } from 'lucide-react';

const Profile = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    medicalConditions: '',
    allergies: '',
    primaryPhysician: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      navigate("/login");
      return;
    }
    const user = JSON.parse(userJson);
    setProfileData(prev => ({
      ...prev,
      name: user.name || prev.name,
      email: user.email || prev.email,
    }));

    (async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`http://localhost:8000/profile/${encodeURIComponent(user.email)}`, {
          headers: { "Accept": "application/json" }
        });
        if (res.data?.profile) {
          const p = res.data.profile;
          setProfileData(prev => ({
            ...prev,
            name: p.name ?? prev.name,
            email: p.email ?? prev.email,
            phone: p.phn ?? prev.phone,
            age: p.age ? String(p.age) : prev.age,
            gender: p.gender ?? prev.gender,
            medicalConditions: p.medCond ?? prev.medicalConditions,
            allergies: p.allergy ?? prev.allergies,
            primaryPhysician: p.doc ?? prev.primaryPhysician,
          }));
        }
      } catch (err) {
        console.warn("No profile found or fetch error", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    if (field === "email") return;
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        name: profileData.name,
        email: profileData.email,
        phn: profileData.phone,
        age: profileData.age ? Number(profileData.age) : null,
        gender: profileData.gender,
        medCond: profileData.medicalConditions,
        allergy: profileData.allergies,
        doc: profileData.primaryPhysician,
      };

      await axios.put(
        `http://localhost:8000/profile/${encodeURIComponent(profileData.email)}`,
        payload,
        { headers: { "Content-Type": "application/json", "Accept": "application/json" } }
      );

      localStorage.setItem(`userProfile_${profileData.email}`, JSON.stringify(profileData));

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.response?.data?.detail || err.message || "Could not save profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  if (isLoading && !profileData.email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-medical-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <Card className="shadow-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-cyan-600 text-xl">
                    {profileData.name ? getInitials(profileData.name) : <UserIcon className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{profileData.name || 'Your Name'}</CardTitle>
              <div className="flex flex-col space-y-2 items-center justify-center mt-2 text-sm text-muted-foreground">
                {profileData.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{profileData.email}</span>
                  </div>
                )}
                {profileData.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{profileData.phone}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {profileData.age && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Age:</span>
                    <span className="font-medium">{profileData.age} years</span>
                  </div>
                )}
                {profileData.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Gender:</span>
                    <span className="font-medium">{profileData.gender}</span>
                  </div>
                )}
                {profileData.primaryPhysician && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Physician:</span>
                    <span className="font-medium">{profileData.primaryPhysician}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="shadow-md">
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal and medical information</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={profileData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Input
                      id="gender"
                      value={profileData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="physician">Primary Physician</Label>
                    <Input
                      id="physician"
                      value={profileData.primaryPhysician}
                      onChange={(e) => handleInputChange('primaryPhysician', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conditions">Medical Conditions</Label>
                  <Textarea
                    id="conditions"
                    className="min-h-24"
                    value={profileData.medicalConditions}
                    onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies & Medications</Label>
                  <Textarea
                    id="allergies"
                    className="min-h-24"
                    value={profileData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
