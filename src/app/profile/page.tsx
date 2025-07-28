
import Footer from '@/components/footer';

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <main className="flex-grow flex items-center justify-center">
        <h1 className="text-4xl font-bold">Profile Page</h1>
      </main>
      <Footer />
    </div>
  );
}
