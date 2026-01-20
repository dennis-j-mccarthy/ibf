import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const testimonials = [
    {
      title: 'Sr. Maria Guadalupe Hallee, O.P., the Principal at St. Isaac Jogues School in St. Clair Shores, MI (180 students), hosted an Ignatius Book Fair in February 2024.',
      blurb: 'We had a great experience with Ignatius Book Fairs! We were looking for a book fair which would provide quality children\'s books which had been thoroughly vetted, so that we could be confident in allowing our students to browse to find something they would like. The selection of books, the variety of authors and genres, and the assistance we received from the staff of Ignatius Book Fairs led to a very successful event! We raised a generous amount of money for books for our school library, and we received very positive reviews from our librarian, our parents, our teachers, our students, and our parishioners. We are already looking forward to our next Ignatius Book Fair!',
      type: 'Catholic',
      order: 1,
    },
    {
      title: 'Joan Hill, Librarian at St. Anthony Catholic School in Columbus, TX (175 students), hosted an Ignatius Book Fair in February 2024.',
      blurb: 'You gave the best advice to invite our parishioners after the weekend Masses to kick off the fair. Our CCE program is on Wednesday evenings and including them was a big hit.\n\nYour customer service was outstanding! The books arrived in plenty of time to set up the fair in the library. Anytime that I had questions or a few issues, Ana answered me immediately and was so understanding and helpful.\n\nEveryone was so impressed with the outstanding quality and selection of the books. It was so rewarding to see the parents excitement over books that they had read. Now they bought these books for their children. When our students joyfully bought books about our Catholic faith, we felt so blessed to be giving honor and glory to God. It was a great selection of books about the Catholic faith for children. It was more than saint books. Thank you again for providing a CATHOLIC book fair to a small Catholic school in Texas.',
      type: 'Catholic',
      order: 2,
    },
    {
      title: 'Anna Cameron, Librarian at Our Lady of Mount Carmel Catholic School in Tempe, Arizona, (450 students), hosted an Ignatius Book Fair in February 2024.',
      blurb: 'My community and I LOVED the book fair and would like to host it again. I am also passing along your information to a few other Catholic schools in our diocese. We loved the quality of the books! LOVED them. In particular, we loved the books the Magnificat produces. There is a huge need and interest in vibrant, imaginative children\'s picture books that teach virtue, our faith, and STORIES from the lives of the saints. I can\'t thank you enough for your work to get these books into our hands. Our school and parish thanks you!',
      type: 'Catholic',
      order: 3,
    },
    {
      title: 'Deborah Thomas, Principal at St. Louis School in Clarksville, Maryland (575 students), hosted an Ignatius Book Fair in March 2024.',
      blurb: 'Our Ignatius Book Fair went very well. We were very pleased with the process and books. We will be hosting a fair again next year! God bless and thank you!',
      type: 'Catholic',
      order: 4,
    },
  ]

  for (const testimonial of testimonials) {
    await prisma.testimonial.create({
      data: testimonial,
    })
  }

  console.log(`✅ Added ${testimonials.length} Catholic testimonials`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
