export default function HeadingsDemo() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-4xl space-y-8">
        <h1 className="text-6xl">H1 - Chivo ExtraLight 200</h1>
        <h2 className="text-5xl">H2 - Chivo ExtraLight 200</h2>
        <h3 className="text-4xl">H3 - Chivo ExtraLight 200</h3>
        <h4 className="text-3xl">H4 - Chivo ExtraLight 200</h4>
        <h5 className="text-2xl">H5 - Chivo ExtraLight 200</h5>
        <h6 className="text-xl">H6 - Chivo ExtraLight 200</h6>
        
        <div className="border-t pt-8 mt-8">
          <p className="text-base mb-4">
            Dette er normal brødtekst med Poppins font. Lorem ipsum dolor sit amet, 
            consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore 
            et dolore magna aliqua.
          </p>
          <p className="text-sm">
            Dette er mindre tekst (text-sm) med Poppins. Ut enim ad minim veniam, 
            quis nostrud exercitation ullamco laboris.
          </p>
        </div>
      </div>
    </div>
  );
}
