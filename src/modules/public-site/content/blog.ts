/**
 * The nine blog posts of the old site, carried over word for word (owner decision UI22). They are
 * dated news: figures such as the 50% VIP promotion in the REBAP post belong to their date.
 */
export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] }
  | { type: "lead"; text: string }
  | { type: "sign"; text: string };

export type BlogCategory = "Events & Activities" | "Blog" | "Eco-Friendly Living" | "Wellness & Relaxation" | "Behind the Scenes" | "Resort Highlights" | "News & Promos";

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  categories: BlogCategory[];
  excerpt: string;
  cover: { src: string; alt: string };
  /** What the shared closing block shows after the text. */
  closing?: "experience" | "vip" | "contact";
  /** Optional sidebar card: short highlights taken from the post's own text. */
  highlights?: string[];
  /** Title of the highlights card when "Event Highlights" does not fit the post. */
  highlightsTitle?: string;
  /** Optional sidebar card: one-paragraph summary of the event, taken from the post's own text. */
  about?: string;
  blocks: BlogBlock[];
};

const cover = (name: string, alt: string) => ({ src: `/images/site/blog/${name}.webp`, alt });

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "afhomes-participates-in-the-ai-business-summit-2026-in-tagaytay",
    title: "AFhomes Participates in the AI Business Summit 2026 in Tagaytay",
    date: "2026-11-09",
    categories: ["Events & Activities"],
    excerpt: "AFhomes joined the AI Business Summit 2026 in Tagaytay City as one of its Diamond Sponsors.",
    cover: cover("ai-business-summit", "AFhomes at the AI Business Summit 2026"),
    closing: "experience",
    highlights: ["AI for Business Growth, Leadership & Innovation", "Industry experts and distinguished speakers", "Practical AI applications for businesses", "Networking and collaboration opportunities"],
    about: "The AI Business Summit 2026 brought together business leaders, entrepreneurs, and technology enthusiasts to explore the growing role of Artificial Intelligence in transforming businesses and shaping the future of industries.",
    blocks: [
      { type: "lead", text: "Supporting Innovation, Business Growth, and the Future of Artificial Intelligence" },
      { type: "p", text: "AFhomes Hotspring & Ecofarm Resort Corp. proudly participated as one of the Diamond Sponsors of the AI Business Summit 2026, held in Tagaytay City on October 26, 2026." },
      { type: "p", text: "Centered on the theme “AI for Business Growth, Leadership & Innovation,” the summit brought together business leaders, entrepreneurs, executives, professionals, and technology enthusiasts to explore the growing role of Artificial Intelligence in transforming businesses and shaping the future of industries." },
      { type: "p", text: "AFhomes demonstrated its commitment to supporting initiatives that encourage innovation, knowledge-sharing, collaboration, and business development. The company's participation reflects its belief in embracing new opportunities, staying ahead of emerging trends, and recognizing the importance of technology in an increasingly digital world." },
      { type: "h2", text: "Empowering Businesses Through Innovation" },
      { type: "p", text: "The AI Business Summit provided a platform for meaningful discussions and insights into how Artificial Intelligence can create new opportunities for businesses. Key topics included AI-powered business strategies, operational automation, digital marketing, leadership, and the future of work." },
      { type: "p", text: "With industry experts and distinguished speakers sharing their knowledge and experiences, the event encouraged participants to discover practical ways to integrate AI into their organizations and improve business performance." },
      { type: "h2", text: "Building Connections and Exploring New Opportunities" },
      { type: "p", text: "Beyond technology and innovation, the summit served as an opportunity for networking and collaboration among business communities, entrepreneurs, and industry professionals." },
      { type: "p", text: "AFhomes recognizes that meaningful partnerships and continuous learning are essential in building a progressive and sustainable business environment. Through its involvement in events such as this, the company continues to support initiatives that bring people together, encourage fresh perspectives, and open doors to new possibilities." },
      { type: "h2", text: "AFhomes: Moving Forward with Innovation" },
      { type: "p", text: "At AFhomes, growth means continuously improving, embracing opportunities, and creating meaningful experiences. While the company remains committed to its vision of providing exceptional homestyle hospitality, natural hot spring experiences, and wellness-centered resort living, it also recognizes the value of innovation in strengthening its operations and future direction." },
      { type: "p", text: "Being one of the Diamond Sponsors of the AI Business Summit 2026 marks another meaningful opportunity for AFhomes to demonstrate its support for progress, innovation, and the evolving business landscape." },
      { type: "p", text: "AFhomes Hotspring & Ecofarm Resort Corp. remains committed to growing alongside a changing world, where innovation, collaboration, and meaningful connections help shape a brighter future." },
      { type: "sign", text: "Amazing & Fun, Your Home Away from Home." },
    ],
  },
  {
    slug: "elevating-our-standards-one-step-closer-to-excellence",
    title: "Elevating Our Standards: AFhomes Takes Another Step Toward Excellence",
    date: "2026-03-11",
    categories: ["Events & Activities"],
    excerpt: "Excellence is a commitment that guides every decision, every service, and every experience we provide.",
    cover: cover("1-scaled", "AFhomes team development initiative"),
    highlightsTitle: "Training Focus",
    highlights: ["Modern hospitality standards", "Customer service excellence", "Effective communication and client engagement"],
    about: "Excellence is a commitment that guides every decision, every service, and every experience we provide.",
    closing: "experience",
    blocks: [
      { type: "p", text: "At AFhomes Hotspring & Ecofarm Resort Corp., excellence is not just a goal. It is a commitment that guides every decision, every service, and every experience we provide." },
      { type: "p", text: "As part of our continuous growth, AFhomes recently conducted an internal development initiative aimed at strengthening the knowledge, skills, and leadership capabilities of our team. This initiative reflects our mission to constantly improve the way we serve our guests, partners, and members." },
      { type: "h2", text: "Investing in People: The Heart of AFhomes" },
      { type: "p", text: "Behind every great organization is a strong and empowered team. At AFhomes, we believe that investing in our people is one of the most powerful ways to ensure long-term success." },
      { type: "p", text: "Through specialized training sessions and strategic discussions, our team explored important topics such as:" },
      { type: "list", items: ["Modern hospitality standards", "Customer service excellence", "Effective communication and client engagement"] },
      { type: "p", text: "These learning opportunities help our team stay updated with modern trends in hospitality and tourism, allowing AFhomes to remain competitive in an ever-evolving industry." },
      { type: "h2", text: "Raising the Standard of Hospitality" },
      { type: "p", text: "AFhomes Hotspring & Ecofarm Resort is more than just a destination. It is a place where families, friends, and communities come together to relax, recharge, and create meaningful memories." },
      { type: "p", text: "By continuously enhancing the capabilities of our team, we ensure that every guest experience reflects the warmth, professionalism, and hospitality that AFhomes is known for." },
      { type: "p", text: "From our natural hot spring pools to our ecofarm environment and family-friendly amenities, our goal is simple:" },
      { type: "sign", text: "To provide a home-style resort experience where every visitor feels welcomed and valued." },
      { type: "h2", text: "Moving Forward, Stronger Than Ever" },
      { type: "p", text: "As AFhomes continues to grow, initiatives like these help us stay focused on what truly matters: people, service, and excellence." },
      { type: "p", text: "This step forward is just one of many as we continue building a stronger organization dedicated to delivering memorable experiences and meaningful opportunities." },
      { type: "p", text: "Whether you are a guest, partner, or future member of the AFhomes community, we invite you to be part of our journey." },
    ],
  },
  {
    slug: "discover-the-authentic-natural-hot-springs-in-laguna",
    title: "Discover the Authentic Natural Hot Springs in Laguna",
    date: "2025-09-02",
    categories: ["Blog", "Eco-Friendly Living", "Wellness & Relaxation"],
    excerpt: "Wellness and relaxation at the resort's natural hot springs: a sanctuary where nature, comfort and community meet.",
    cover: cover("1", "Natural hot springs in Laguna"),
    highlightsTitle: "Wellness Benefits",
    highlights: ["Relieve stress and tension", "Support skin health", "Reduce joint pain and muscle fatigue", "Enhance overall well-being through deep relaxation"],
    blocks: [
      { type: "p", text: "Laguna has long been known as the home of natural hot springs in the Philippines, but not all experiences are created equal. At AFhomes Hotspring & Ecofarm Resort, we are building more than just another destination. We are creating a sanctuary where the authenticity of natural hot springs in Laguna is preserved, celebrated, and shared with families, wellness seekers, and future generations." },
      { type: "h2", text: "What Makes Our Natural Hot Springs Authentic" },
      { type: "p", text: "Many resorts advertise heated pools, but few offer the true volcanic-heated waters of Laguna. Our hot springs are drawn directly from the earth's natural underground reservoirs, rich in minerals that soothe muscles, improve circulation, and encourage relaxation. Unlike artificially heated water, authentic hot spring pools bring guests closer to the natural rhythms of the environment, offering both healing and harmony." },
      { type: "h2", text: "Wellness Benefits Beyond Relaxation" },
      { type: "p", text: "Choosing authentic natural hot springs in Laguna is not only about warmth; it's about health and rejuvenation. Studies show that mineral-rich geothermal waters can:" },
      { type: "list", items: ["Relieve stress and tension", "Support skin health", "Reduce joint pain and muscle fatigue", "Enhance overall well-being through deep relaxation"] },
      { type: "p", text: "At AFhomes, our goal is to welcome guests with wellness as our gift. Every soak in our hot springs becomes part of a holistic escape, blending body care with peace of mind." },
      { type: "h2", text: "A Commitment to Sustainability" },
      { type: "p", text: "The authenticity of our hot springs also means minimal environmental impact. By drawing naturally heated water, we eliminate the need for artificial heating systems that consume electricity and emit carbon. This eco-friendly advantage reflects our core value: success flourishes in the gardens of respect, for people, for nature, and for the community." },
      { type: "h2", text: "Your Future Home for Wellness and Gatherings" },
      { type: "p", text: "Though AFhomes Hotspring & Ecofarm Resort is still under construction, the vision is clear: a home-style retreat where families, friends, and businesses can gather and create lasting memories. Guests will enjoy a balance of modern comforts and authentic natural landscapes, surrounded by gardens and eco-friendly spaces." },
      { type: "h2", text: "Be Among the First to Experience It" },
      { type: "p", text: "We invite you to be part of this journey. Through our exclusive VIP Privilege Loyalty Program, you can secure early access to our resort's natural hot springs in Laguna and enjoy privileges such as exclusive long-term VIP discounts, advance booking rights, and special cardholder rewards. It's more than a privilege card. It's your way of making AFhomes your true second home." },
    ],
  },
  {
    slug: "were-growing-just-for-you",
    title: "We're Growing—Just for You!",
    date: "2025-04-15",
    categories: ["Behind the Scenes"],
    excerpt: "The resort is expanding, because great service begins with an exceptional space.",
    cover: cover("were-growing-just-for-you-2-hero", "The expanded AFhomes office"),
    highlightsTitle: "What's New",
    highlights: ["A New Reception Lobby", "Spacious Office Area", "Wash Area & Restrooms", "Teppanyaki Lounge", "Training and Meeting Rooms", "Kids Playground"],
    closing: "vip",
    blocks: [
      { type: "h2", text: "AFhomes Hotspring & Ecofarm Resort Expands to Serve You Better" },
      { type: "p", text: "At AFhomes Hotspring & Ecofarm Resort, we believe that exceptional service starts with an exceptional space. That's why we're excited to share that we're expanding, not just to grow, but to serve you better." },
      { type: "p", text: "Our upcoming expansion is designed to enhance your experience with us, offering modern comfort, functional spaces, and family-friendly features that reflect our commitment to wellness, warmth, and service excellence." },
      { type: "h2", text: "What's New?" },
      { type: "p", text: "At AFhomes Hotspring & Ecofarm Resort, we believe that how we work reflects how we serve. That's why we're expanding, not just to grow, but to give our clients and team a better experience starting today. While our full resort is still under construction, our newly expanded office is already offering a preview of the comfort, hospitality, and family-friendly features our VIP Privilege Cardholders can look forward to." },
      { type: "p", text: "Here's what's coming your way in our upgraded headquarters:" },
      { type: "h3", text: "A New Reception Lobby" },
      { type: "p", text: "A warm welcome begins here. Our new lobby isn't just a front desk. It's a space designed to reflect the homestyle spirit of our future resort. Every guest who walks in will feel the sincerity of our service and the promise of what's ahead, from the very first step." },
      { type: "h3", text: "Spacious Office Area" },
      { type: "p", text: "With our growing team comes a bigger, better workspace. This improved setup ensures our VIP clients experience more responsive service, faster coordination, and an overall smoother process. It's a working space that mirrors the quality and care we're building into every aspect of the AFhomes brand." },
      { type: "h3", text: "Wash Area & Restrooms" },
      { type: "p", text: "Because comfort matters even in the smallest moments, we've included thoughtfully designed wash areas and restrooms. Clean, accessible, and guest-friendly, they're part of the complete hospitality experience we're committed to providing, even before our resort opens its doors." },
      { type: "h3", text: "Teppanyaki Lounge" },
      { type: "p", text: "As part of our commitment to serve you better, AFhomes is expanding its offerings with the addition of four thoughtfully designed Teppanyaki Lounges, each offering more than just a dining experience. These lounges feature immersive teppanyaki-style dining, complemented by a wellness bar serving sassy water, fresh fruit juices, and coffee. To further elevate your comfort, each lounge includes four massage chairs, a tea table, a cozy sofa, and a space designed for relaxation and meaningful connection. This is not just a preview of our amenities. It's a reflection of the warm, wellness-driven lifestyle that defines the AFhomes Hotspring & Ecofarm Resort. As we grow, we remain focused on creating spaces where your family can feel at home, unwind, and thrive." },
      { type: "h3", text: "Training and Meeting Rooms" },
      { type: "p", text: "Great service starts with great training. These rooms are where our in-house team gathers, learns, and grows. By investing in these spaces, we ensure our team delivers exceptional service to our clients, especially our future VIP Privilege Cardholders who will come to expect only the best." },
      { type: "h3", text: "Kids Playground" },
      { type: "p", text: "We're a family-centered brand, and that's reflected even here at the office. While parents meet with our team or explore the VIP Privilege Loyalty Program options, kids can enjoy a safe, engaging play area designed with fun and comfort in mind. It's a small touch that makes a big difference for families visiting us." },
      { type: "h2", text: "A Glimpse Into VIP Life" },
      { type: "p", text: "This office expansion is more than just added space. It's a glimpse into the lifestyle we're creating at AFhomes Hotspring & Ecofarm Resort. As a VIP Privilege Cardholder, you're not just securing early access; you're stepping into a world of thoughtful convenience, meaningful perks, and exclusive privileges designed to bring your family closer to wellness, comfort, and joy. It's more than a stay. It's your true second home, reimagined." },
      { type: "h3", text: "Smart Choice for Your Health, Family Fun, and Status" },
      { type: "list", items: [
        "Special long-term VIP discounts of 15% to 25% for all consumption: entrance fees, restaurants, coffee shop, wine bar, videoke, massage, spa, conference room, events, amusement games, adventure games, eco-farming experience, native products shops, and staycation.",
        "Annual Welcome Gift Loyalty Stay Points for accommodations.",
        "The Gold VIP Privilege Card has a 22-year validity, and can be registered in two persons' names.",
        "Advance Reservation Rights allow a VIP Privilege Cardholder to make reservations one month in advance, while non-cardholders can only reserve one week in advance, giving the primary cardholder an advantage during peak times.",
        "No Annual Maintenance Fees.",
        "Birthday Gifts to make your special day even better.",
      ] },
      { type: "p", text: "Whether it's for your health, your family, or your future, joining the VIP Privilege Loyalty Program is the smart choice, offering lasting value, premium perks, and a place where memories are made and traditions are honored." },
    ],
  },
  {
    slug: "reimagining-the-resort-experience-why-afhomes-is-your-true-home-away-from-home",
    title: "Reimagining the Resort Experience: Why AFhomes is Your True Home Away from Home",
    date: "2025-01-14",
    categories: ["Resort Highlights"],
    excerpt: "What makes a homestyle resort different, and why it should be your next destination.",
    cover: cover("homestyle-blog-header", "A homestyle villa at AFhomes"),
    highlightsTitle: "The AFhomes Difference",
    highlights: ["Thoughtful Accessibility That Makes Sense", "True Freedom to Create Your Experience", "Nature Meets Nurture"],
    closing: "vip",
    blocks: [
      { type: "p", text: "In a world of traditional resorts, AFhomes Hotspring & Ecofarm Resort stands apart as the Philippines' first largest homestyle hot spring and ecofarm resort. But what exactly makes a homestyle resort different, and why should it be your next destination? Let's explore how AFhomes revolutionizes the resort experience by putting families first." },
      { type: "h2", text: "The Traditional Resort Challenge" },
      { type: "p", text: "We've all been there: struggling with luggage through endless corridors, waiting for shuttle services, paying excessive corkage fees for outside food, and feeling constrained by rigid schedules. Traditional resorts, while luxurious, often create barriers to the natural flow of family life." },
      { type: "h2", text: "The AFhomes Hotspring & Ecofarm Resort Difference: Where Luxury Meets Home Comfort" },
      { type: "p", text: "At AFhomes, we've reimagined resort living by combining the best of both worlds: the luxuries of a premium resort with the comfort and freedom of home. Here's how we're different:" },
      { type: "h3", text: "Thoughtful Accessibility That Makes Sense" },
      { type: "p", text: "Imagine driving directly to your private homestyle villa, effortlessly unloading your bags, and having your car conveniently parked nearby for easy access whenever needed. No more long walks with heavy luggage or waiting for shuttles. Say goodbye to getting drenched in the rain or braving the scorching sun while hauling your belongings from a parking lot dozens of meters away. This simple yet revolutionary approach makes all the difference, especially for families with seniors, children, or groceries, ensuring your vacation starts with ease and comfort." },
      { type: "h3", text: "True Freedom to Create Your Experience" },
      { type: "p", text: "Unlike traditional resorts that restrict outside food and impose hefty corkage fees, AFhomes Hotspring & Ecofarm Resort celebrates the Asian tradition of family cooking and sharing. Our homestyle villas are thoughtfully designed with fully equipped kitchens and spacious dining areas, allowing you to prepare and enjoy your favorite meals without extra charges. Prefer to unwind completely? Let us cater to your culinary desires with our fresh and flavorful Farm-to-Table Dining experience. At AFhomes, it's all about giving you the freedom to create a vacation that feels truly your own." },
      { type: "h3", text: "Nature Meets Nurture" },
      { type: "p", text: "Our resort seamlessly blends natural wonders with modern comforts. Soak in our natural geothermal pools, where mineral-rich waters provide therapeutic relaxation. Retreat to luxury villas that offer stunning views of lush tropical gardens through floor-to-ceiling windows. It's the perfect balance of nature's healing power and contemporary homestyle luxury." },
      { type: "h2", text: "Beyond Accommodation: A Complete Sustainable Ecosystem" },
      { type: "p", text: "What sets AFhomes Hotspring & Ecofarm Resort apart is our commitment to creating a comprehensive and eco-friendly experience:" },
      { type: "list", items: ["Outstanding service from our warm, attentive staff", "All-in-one fun with customizable activities for every age group", "Immersion in amazing nature with access to stunning landscapes", "True value for money without compromising on quality", "The authentic feeling of being at home, enhanced by resort luxuries"] },
      { type: "h2", text: "A New Standard in Resort Living" },
      { type: "p", text: "As the Philippines' pioneer in homestyle resorts, AFhomes Hotspring & Ecofarm Resort isn't just offering accommodation. We're providing a space where families can truly live, laugh, and create memories together. Our approach honors family traditions while adding the perfect touch of luxury and convenience." },
      { type: "p", text: "Whether you're planning a family reunion, a wellness retreat, or simply seeking a different kind of vacation experience, AFhomes offers the freedom to vacation your way. Here, you'll find more than just a place to stay. You'll discover your amazing and fun home away from home." },
      { type: "p", text: "Come experience the difference at AFhomes Hotspring & Ecofarm Resort, where every stay is an opportunity to create lasting memories in the comfort of home, enhanced by the luxuries of a premium resort." },
      { type: "h2", text: "VIP Privilege Loyalty Program: Exclusive Access, Exceptional Benefits" },
      { type: "p", text: "The homestyle experience at AFhomes Hotspring & Ecofarm Resort can be further enhanced by becoming a primary cardholder of our exclusive VIP Privilege Loyalty Program. Choose one of our VIP Privilege Card tiers and unlock exclusive benefits designed to elevate your stay and make every visit even more rewarding." },
      { type: "p", text: "Become a VIP Privilege Cardholder today and enjoy the luxurious benefits and additional perks that make every visit to AFhomes Hotspring & Ecofarm Resort even more special." },
    ],
  },
  {
    slug: "introducing-the-bronze-vip-privilege-loyalty-program-your-first-step-into-resort-privileges-at-afhomes-resort",
    title: "Introducing the Bronze VIP Privilege Card: Your First Step into Resort Privileges at AFhomes Resort",
    date: "2025-01-03",
    categories: ["News & Promos"],
    excerpt: "The Bronze card is the entry tier for people new to the VIP Privilege Loyalty Program.",
    cover: cover("introducing-the-bronze-vip-membershipheader-1", "The Bronze VIP Privilege Card"),
    highlightsTitle: "Card Benefits",
    highlights: ["Annual Welcome Gift Loyalty Stay Points with a total worth of 50K.", "15% long-term VIP discount on all resort consumption", "Advance priority booking and reservations", "Complimentary free entrance for the cardholder"],
    closing: "vip",
    blocks: [
      { type: "p", text: "Start your journey into the world of exclusive resort benefits with our Bronze VIP Privilege Card at AFhomes Resort. Designed specifically for those new to the VIP Privilege Loyalty Program, this introductory tier offers an accessible way to experience premium resort perks." },
      { type: "h2", text: "Why Bronze VIP Is Perfect for Newcomers" },
      { type: "p", text: "Our Bronze VIP package provides the ideal introduction to exclusive benefits without overwhelming commitment. This thoughtfully designed tier helps you discover the advantages of membership at your own pace." },
      { type: "h2", text: "Welcoming Staycation Benefits" },
      { type: "p", text: "Begin your VIP experience with 50K loyalty stay points, conveniently distributed as 10K annually over five years. This structured approach allows you to gradually explore and enjoy our resort's amenities." },
      { type: "h2", text: "Easy-to-Use Savings on Resort Experiences" },
      { type: "p", text: "As a Bronze VIP Privilege Cardholder, you'll enjoy straightforward benefits:" },
      { type: "list", items: ["Annual Welcome Gift Loyalty Stay Points with a total worth of 50K.", "15% long-term VIP discount on all resort consumption", "Advance priority booking and reservations", "Complimentary free entrance for the cardholder"] },
      { type: "h2", text: "Who Should Choose the Bronze VIP Privilege Card?" },
      { type: "p", text: "This entry-level privilege card is perfect for:" },
      { type: "list", items: ["First-time resort privilege cardholders exploring VIP benefits", "Young professionals starting their leisure journey", "Occasional resort visitors wanting basic privileged access", "Those seeking an introduction to exclusive resort perks"] },
      { type: "h2", text: "The Bronze VIP Experience" },
      { type: "p", text: "The Bronze VIP Privilege Card offers an excellent way to test the waters of resort-exclusive access and benefits. With annual welcome gift loyalty stay points and straightforward discounts, you can begin experiencing the advantages of being a primary cardholder while deciding if you'd like to upgrade to higher tiers in the future." },
    ],
  },
  {
    slug: "empowering-success-afhomes-commitment-to-excellence",
    title: "Empowering Success: AFhomes' Commitment to Excellence",
    date: "2024-12-02",
    categories: ["Behind the Scenes"],
    excerpt: "Training and seminars that prepare every team member to lead.",
    cover: cover("empowering-success-featured", "AFhomes team seminar"),
    highlightsTitle: "Training Topics",
    highlights: ["Building Expertise with Market Trends", "Delivering Customer Service Excellence", "Boosting Visibility with Digital Marketing", "Leading with Vision and Purpose", "Fostering Lifelong Learning"],
    closing: "contact",
    blocks: [
      { type: "p", text: "At AFhomes, empowering our team is a priority. Through focused training and seminars, we ensure every participant is prepared to lead. These programs are designed to inspire, educate, and equip our team for success." },
      { type: "h2", text: "Building Expertise with Market Trends" },
      { type: "p", text: "Keeping pace with market trends is vital. AFhomes recently hosted a seminar to explore the latest industry developments. Participants learned predictive strategies to stay competitive." },
      { type: "p", text: "By understanding market dynamics, our team is better equipped to anticipate changes. This forward-thinking approach empowers us to innovate and lead." },
      { type: "h2", text: "Delivering Customer Service Excellence" },
      { type: "p", text: "Exceptional customer service is our standard. A recent seminar reinforced this commitment. The session focused on exceeding expectations and creating memorable experiences for clients." },
      { type: "p", text: "Team members practiced strategies to resolve issues quickly. They also explored ways to build lasting relationships. These skills help ensure every client interaction leaves a lasting impression." },
      { type: "h2", text: "Boosting Visibility with Digital Marketing" },
      { type: "p", text: "Effective marketing strategies are vital for growth in the digital age. AFhomes hosted a seminar on SEO and digital advertising best practices to elevate the resort's visibility and impact." },
      { type: "p", text: "The seminar also emphasized the importance of optimizing social media content and the website for better visibility online. Paid advertising is a powerful tool for immediate reach. Employees learned how to maximize platforms like Google Ads and Facebook Ads." },
      { type: "h2", text: "Leading with Vision and Purpose" },
      { type: "p", text: "AFhomes thrives under the guidance of visionary leaders. President Dan Coner inspires strategic innovation and sets high standards. His dedication ensures the company achieves its ambitious goals." },
      { type: "p", text: "Vice President Mark Anthony Sioson motivates the team with his passion for continuous improvement. Through his leadership, employees embrace challenges and pursue excellence. Together, these leaders create an environment where growth and achievement flourish." },
      { type: "h2", text: "Fostering Lifelong Learning" },
      { type: "p", text: "Continuous education is central to AFhomes' success. Each seminar reflects the company's belief in empowering employees with the skills needed to excel. By fostering a culture of growth, AFhomes ensures its team is always ready to meet industry challenges and exceed expectations." },
      { type: "h2", text: "Join the AFhomes Journey" },
      { type: "p", text: "AFhomes is more than a resort; it is a thriving community driven by innovation, dedication, and passion. Together, we are transforming the world of hospitality by delivering unforgettable experiences that captivate and endure." },
      { type: "p", text: "We believe in the power of collaboration and invite opportunities for partnerships and accreditations. By fostering meaningful relationships, we broaden our horizons and elevate the client experience to new heights." },
      { type: "p", text: "Join our team of enthusiastic professionals and become a part of this transformative but fun journey. Together, let's reshape the future of hospitality with creativity, fun, excellence, and unwavering commitment." },
      { type: "sign", text: "Let's build a brighter future together!" },
    ],
  },
  {
    slug: "celebrating-excellence-highlights-from-rebap-natcon-2024",
    title: "Celebrating Excellence: Highlights from REBAP NATCON 2024",
    date: "2024-11-11",
    categories: ["Events & Activities"],
    excerpt: "Highlights from the REBAP National Convention, held November 8 to 10, 2024 at the Taal Vista Hotel in Tagaytay.",
    cover: cover("featured", "AFhomes at REBAP NATCON 2024"),
    highlights: ["Introducing AFhomes Hotspring & Ecofarm Resort", "Exclusive Deals: A Crowd-Pleasing Success", "Learning, Growing, and Innovating", "Fostering Connections and Collaboration", "Recognition for Excellence: A Plaque of Appreciation"],
    about: "Highlights from the REBAP National Convention, held November 8 to 10, 2024 at the Taal Vista Hotel in Tagaytay.",
    blocks: [
      { type: "p", text: "From November 8–10, 2024, the Taal Vista Hotel in Tagaytay hosted the REBAP National Convention. This highly anticipated event brought together leaders, innovators, and visionaries in real estate. As a result, the convention sparked exciting conversations and ideas for the future of the industry." },
      { type: "p", text: "AFhomes was honored to be part of it, and we were excited to showcase our commitment to innovation, sustainability, and exceptional service." },
      { type: "h2", text: "Introducing AFhomes Hotspring & Ecofarm Resort" },
      { type: "p", text: "One of the event highlights was the introduction of AFhomes Hotspring & Ecofarm Resort Corp. This was led by Mr. Mark Anthony Sioson, our Vice President for Sales and Marketing. During his presentation, Mr. Sioson shared our vision for a community that blends eco-living with luxury and wellness." },
      { type: "p", text: "Located in Laguna, the resort offers natural hot springs, homestyle living, and a focus on sustainability. In fact, Mr. Sioson described the project as an example of how hospitality, sustainability, and community can work together seamlessly." },
      { type: "h2", text: "Exclusive Deals: A Crowd-Pleasing Success" },
      { type: "p", text: "Our booth quickly became a must-see attraction, drawing visitors eager to learn about the benefits of joining the AFhomes family. Many were excited by our 50% discount on the VIP Privilege Card, which offers premium perks, exclusive discounts, and unforgettable experiences at our resort." },
      { type: "p", text: "The booth was buzzing with energy, and we received invaluable feedback from real estate professionals and potential investors. To make the experience even more special, we gave out thoughtful giveaways like fans, ballpens, and umbrellas." },
      { type: "h2", text: "Learning, Growing, and Innovating" },
      { type: "p", text: "The REBAP National Convention wasn't just an opportunity to showcase AFhomes. It also provided a platform for learning and growth. Our team attended insightful talks, gaining new insights and strategies for improving our services." },
      { type: "p", text: "These valuable lessons inspired us to innovate further, and they renewed our determination to serve our clients with even greater passion." },
      { type: "h2", text: "Fostering Connections and Collaboration" },
      { type: "p", text: "One of the most rewarding parts of the event was meeting industry leaders, experts, and like-minded professionals. Through these connections, we were able to discuss new ideas and explore potential collaborations that could help us transform the industry." },
      { type: "h2", text: "Recognition for Excellence: A Plaque of Appreciation" },
      { type: "p", text: "Amid the excitement, we were deeply honored to receive a Plaque of Appreciation for our contributions to the real estate industry. This recognition drives us to continue striving for excellence in all that we do." },
      { type: "h2", text: "Laguna's First Largest Homestyle Hotspring & Ecofarm Resort" },
      { type: "p", text: "The journey of AFhomes Hotspring & Ecofarm Resort Corp. is just beginning, and REBAP NATCON 2024 was an important milestone in our story." },
      { type: "p", text: "To everyone who joined us, thank you for your enthusiasm and support of our vision. We are thrilled to welcome our new VIP privilege cardholders to a world of amazing opportunities." },
      { type: "p", text: "If you haven't visited yet, we invite you to discover Laguna's First and Largest Homestyle Hotspring & Ecofarm Resort. Together, let's build a brighter, greener, and more exciting future." },
    ],
  },
  {
    slug: "afhomes-triumphs-at-the-world-travel-expo-with-its-eco-resort-vision",
    title: "AFhomes Triumphs at the World Travel Expo with Its Eco-Resort Vision",
    date: "2024-10-21",
    categories: ["Events & Activities"],
    excerpt: "AFhomes showcased its vision at the World Travel Expo 2024 at SPACE at One Ayala, Makati City, October 18 to 20.",
    cover: cover("chatgpt-image-may-12-2026-04-04-28-pm", "AFhomes at the World Travel Expo 2024"),
    highlights: ["Natural Beauty: An expansive ecofarm set amidst serene landscapes.", "Luxurious Comfort: Homestyle accommodations designed for relaxation.", "Sustainable Living: Eco-conscious practices and organic farming."],
    about: "AFhomes showcased its vision at the World Travel Expo 2024 at SPACE at One Ayala, Makati City, October 18 to 20.",
    closing: "contact",
    blocks: [
      { type: "h2", text: "A Resounding Success for AFhomes at the World Travel Expo" },
      { type: "p", text: "AFhomes proudly showcased its vision at the prestigious World Travel Expo 2024, held at SPACE at One Ayala, Makati City, from October 18–20. This event helps travelers plan their next adventure by offering exciting travel packages and destination insights. It was the perfect platform to introduce our AFhomes Hotspring & Ecofarm Resort to an enthusiastic audience." },
      { type: "p", text: "Our participation allowed us to highlight our commitment to eco-friendly luxury and sustainable tourism, making an indelible mark on all who visited." },
      { type: "h2", text: "Unveiling the AFhomes Hotspring & Ecofarm Resort Experience" },
      { type: "p", text: "Our booth radiated excitement as we presented the resort's unique offerings. AFhomes Hotspring & Ecofarm Resort provides a rare blend of:" },
      { type: "list", items: ["Natural Beauty: An expansive ecofarm set amidst serene landscapes.", "Luxurious Comfort: Homestyle accommodations designed for relaxation.", "Sustainable Living: Eco-conscious practices and organic farming."] },
      { type: "p", text: "This harmonious combination offers an escape from the hectic pace of daily life while encouraging a connection with nature." },
      { type: "h2", text: "Engaging Visitors with Our Vision" },
      { type: "p", text: "The energy at the World Travel Expo was palpable. Visitors were captivated by our concept of merging homestyle comfort with eco-responsibility. From the moment the doors opened, our booth attracted a steady stream of curious attendees eager to learn more about the expansive offerings of AFhomes Hotspring & Ecofarm Resort." },
      { type: "p", text: "Our team members were ready to share insights about our 60-hectare master-planned project, which features over 20 hectares of natural hot springs and resort areas, more than 600 staycation units, and an array of unique amenities designed to deliver fun, relaxation, and sustainability." },
      { type: "p", text: "Visitors were particularly intrigued by our:" },
      { type: "list", items: [
        "Natural Geothermal Hot Spring Pools: Experience the healing properties of mineral-rich waters for deep relaxation and rejuvenation.",
        "Luxury Villas with Farm-to-Table Dining: Private sanctuaries offering scenic views, sustainable design, and meals made with fresh produce from our ecofarm.",
        "Bamboo Spa Sanctuary: A wellness haven with thermally heated spa services, nutrition workshops, and nature-based therapies.",
        "Regenerative Agriculture Ecofarm: Sustainably cultivated produce offering the freshest farm-to-table cuisine.",
        "Infinity Pool with a Kids' Pool: Relax in a spacious infinity pool while children play safely nearby.",
        "Outdoor Adventures: From thrilling ATV rides and kayaking to nature walks and farm tours, there's something for every adventurer.",
        "Edu-Agricultural Exhibits and Mini Farms: Hands-on experiences to learn about sustainable farming practices.",
      ] },
      { type: "p", text: "Our guests can also enjoy unlimited Japanese and Korean BBQ, explore multiple Asian cuisine restaurants, and partake in cultural nights celebrating local heritage." },
      { type: "p", text: "Every detail of AFhomes Hotspring & Ecofarm Resort reflects our commitment to providing a luxurious yet eco-conscious experience where comfort, nature, and sustainability coexist. The overwhelming interest and excitement from expo attendees reaffirmed that our vision of an eco-friendly paradise resonates with those seeking a meaningful retreat." },
      { type: "h2", text: "Recognition for Excellence" },
      { type: "p", text: "We are honored to have received a prestigious certification for our exemplary performance at the expo. This recognition reflects our dedication to offering an exceptional eco-resort experience at AFhomes Hotspring & Ecofarm Resort." },
      { type: "p", text: "The award fuels our motivation to continue delivering top-tier service and sustainable practices to our future guests." },
      { type: "h2", text: "Looking Ahead with Gratitude" },
      { type: "p", text: "As we celebrate this milestone, we extend our heartfelt thanks to everyone who visited our booth. Your curiosity and excitement inspire us to bring AFhomes Hotspring & Ecofarm Resort's vision to life." },
      { type: "p", text: "Stay tuned for more updates on AFhomes Hotspring & Ecofarm Resort. We can't wait to welcome you to a place where comfort, nature, and sustainability converge." },
      { type: "h2", text: "Experience AFhomes Hotspring & Ecofarm Resort Like a VIP!" },
      { type: "p", text: "We're excited to invite you to be part of the AFhomes Hotspring & Ecofarm Resort community. With our VIP Privilege Loyalty Program, you can enjoy exclusive benefits, including priority bookings, special discounts, and premium access to our natural hot springs and ecofarm activities." },
      { type: "p", text: "Make your next adventure truly unforgettable. Embrace relaxation, sustainability, and homestyle luxury, all in one place." },
    ],
  },
];

export const BLOG_CATEGORIES: BlogCategory[] = ["Events & Activities", "Behind the Scenes", "Resort Highlights", "News & Promos", "Blog", "Eco-Friendly Living", "Wellness & Relaxation"];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function formatBlogDate(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

/** Section copy for the Blog index page (owner's reference design, 2026-11-17). */
export const BLOG_PAGE = {
  hero: {
    eyebrow: "AFhomes Lifestyle Blog",
    titleStart: "AFhomes",
    titleAccent: "Lifestyle Blog",
    lede: "News from our team, our events and our resort, in one place.",
    image: { src: "/images/site/resort/18.webp", alt: "A natural hot spring pool at the resort" },
    highlights: [
      { title: "Resort Updates", text: "Latest news and developments", icon: "leaf" },
      { title: "Events & Activities", text: "Seminars, trainings, and highlights", icon: "calendar" },
      { title: "Lifestyle & Wellness", text: "Tips for a healthier, more relaxing life", icon: "sparkles" },
    ] as const,
  },
  /** Filter chips, in the reference order. "Blog" is left out on purpose; every post also has another category. */
  filters: ["Events & Activities", "Behind the Scenes", "Resort Highlights", "News & Promos", "Eco-Friendly Living", "Wellness & Relaxation"] as BlogCategory[],
  latest: { eyebrow: "Latest articles", title: "More Stories from AFhomes" },
  featuredCta: "Read full article",
  cardCta: "Read more",
  pageSize: 6,
  empty: "No posts in this category yet.",
};


/** Copy and photos for a single blog post page (owner's reference design, 2026-11-17). */
export const BLOG_POST_PAGE = {
  backLabel: "All posts",
  author: "By AFhomes",
  shareLabel: "Share:",
  tocTitle: "In this article",
  highlightsTitle: "Event Highlights",
  highlightsImage: { src: "/images/site/resort/18.webp", alt: "A natural hot spring pool at the resort" },
  aboutTitle: "About the Event",
  closing: {
    image: { src: "/images/site/resort/amenities-w-pool1.webp", alt: "A resort pool with loungers" },
    experience: { title: "Experience AFhomes", text: "Discover the beauty, comfort, and hospitality that make AFhomes truly special." },
    vip: { title: "Ready to begin your VIP journey?", text: "Get in touch with us through any of these convenient channels." },
    contact: { title: "Visit or contact us today", text: "We would love to hear from you." },
  },
  olderLabel: "Older post",
  newerLabel: "Newer post",
  allArticles: "All articles",
  relatedTitle: "Related Stories",
  cta: {
    title: "Discover more resort stories",
    text: "Stay updated on our latest events, innovations, and experiences at AFhomes Hotspring & Ecofarm Resort.",
    href: "/blog",
    label: "Explore blog",
    image: { src: "/images/site/resort/amenities-w-terraces-pool1.webp", alt: "The resort terrace pool" },
  },
};

/** Anchor id for a section heading inside a post, e.g. "Empowering Businesses" -> "empowering-businesses". */
export function blogHeadingId(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The post's sections for "In this article": the lead line and every h2, in order. */
export function getBlogSections(post: BlogPost): { id: string; title: string }[] {
  return post.blocks
    .filter((block): block is Extract<BlogBlock, { type: "lead" | "h2" }> => block.type === "lead" || block.type === "h2")
    .map((block) => ({ id: blogHeadingId(block.text), title: block.text }));
}

/** Reading time in whole minutes at about 200 words a minute, never less than 1. */
export function blogReadingMinutes(post: BlogPost): number {
  const words = post.blocks
    .flatMap((block) => (block.type === "list" ? block.items : [block.text]))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Up to `count` other posts: same first category first, then the newest of the rest. */
export function getRelatedPosts(post: BlogPost, count = 3): BlogPost[] {
  const others = BLOG_POSTS.filter((item) => item.slug !== post.slug);
  const same = others.filter((item) => item.categories.includes(post.categories[0]));
  const rest = others.filter((item) => !same.includes(item));
  return [...same, ...rest].slice(0, count);
}
