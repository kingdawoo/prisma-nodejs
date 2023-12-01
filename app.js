// Modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // krävs för enctype = multipart/form-data (filuppladdning)
const notifier = require('node-notifier');

const app = express();

// Prisma
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // CRUD operationer kan göras här direkt
}

main()
  .then(async () => {
    await prisma.$disconnect()
})
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})

// Behandla statiska filer i det nuvarande dir (med hjälp av express module)
app.use(express.static('.'));

// Multer storage config (cb = callback)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/')); // destinationen där alla uppladdade bilder går
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // använd originalla namnet för filen
  }
});

// Variable som ska behandla filuppladningarna med definierad lagring (linje 12-19)
const upload = multer({ storage: storage });

// Parse URL-encoded body, tilldelar resultat inuti req.body 
app.use(express.urlencoded({ extended: true })); // extended: true; för mer komplexa objekt


// Routes för HTML filerna
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/create_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'create_user.html'));
});

app.get('/edit_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'edit_user.html'));
});

app.get('/view_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'view_user.html'));
});

app.get('/delete_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'delete_user.html'));
});

// Starta server på port 3000
app.listen(3000, () => {
  console.log('Server is listening on http://localhost:3000');
});


// V Processa form data från post V

// SKAPA KONTO med prisma
app.post('/create_user', upload.single('image'), async (req, res) => {
  console.log(req.body);

  const formData = req.body; // request.body, ta info från just den client request i <body> html (form)

  // Skapa ett nytt user med form datan och in i 'Users' tabellen med create metoden
  try {
    const newUser = await prisma.user.create({
      data: {
        userName: formData['user-name'],
        email: formData['email'],
        telephone: formData['telephone'],
        image: req.file ? req.file.filename : '',
      },
    });

    notifier.notify({
      title: 'Konto skapad!',
      message: 'Bra jobbat',
      icon: path.join(__dirname, '/img/check.jpg')
    });

    res.redirect('/index.html');
  } catch (error) {
    console.error('Error (skapa):', error);
    res.status(500).send('Error (skapa)');
  }
});

// SÖKA KONTO
app.post('/search_user', async (req, res) => {
  console.log("Searched username: " + req.body.username);

  const userSearched = req.body.username;

  // Använd 'findUnique' metoden för att hitta sökt namn (ifall den finns tilldela dess värden till 'user')
  try {
    const user = await prisma.user.findUnique({ 
      where: {
        userName: userSearched
      }
    });

    if (user) {
      notifier.notify({
        title: 'JA!',
        message: `${userSearched} fanns!`,
        icon: path.join(__dirname, '/img/check.jpg')
      });

      res.send(` 
      <link rel="stylesheet" href="../css/edit_user.css">
      <form action="/edit_user" method="POST" enctype="multipart/form-data">

        <label for="user-name">Användarnamn: </label>
        <input type="text" name="user-name" id="user-name" required>

        <label for="image">Bild: </label>
        <input type="file" accept="image/png, image/jpeg" name="image" id="image">

        <label for="email">Email: </label>
        <input type="email" name="email" id="email">

        <label for="telephone">Telefonnummer: </label>
        <input type="tel" name="telephone" id="telephone">

        <input type="submit" name="edit" value="Redigera">

        <input type="hidden" name="edit-username" value="${userSearched}">
      </form>

      <div id="user-info">
        <p id="u-name">${user.userName}</p>
        <img src="../uploads/${user.image}" alt="Portrait" id="photo" width=250 height=250>
        <p id="email">${user.email}</p>
        <p id="telephone">${user.telephone}</p>
      </div>
    `);
    } else {
      notifier.notify({
        title: 'Fel!',
        message: 'Inget konto med det användarnamn existerar',
        icon: path.join(__dirname, '/img/cross.png')
      });

    }
  } catch (error) {
    console.error('Error (search):', error);
    res.status(500).send('Error (search)');
  }
});

// REDIGERA KONTO
app.post('/edit_user', upload.single('image'), async (req, res) => {
  const editUsername = req.body['edit-username'];

  // Använd metoden 'update' för att uppdatera datan på önskad användare (sökt användare med hjälp av hidden)
  try {
    const updatedUser = await prisma.user.update({ 
      where: {
        userName: editUsername,
      },
      data: {
        userName: req.body['user-name'],
        email: req.body['email'],
        telephone: req.body['telephone'],
        image: req.file ? req.file.filename : '',
      },
    });

    notifier.notify({
      title: 'Konto uppdaterat!',
      message: 'Användarens information har uppdaterats',
      icon: path.join(__dirname, '/img/check.jpg'),
    });

    res.redirect('/index.html');
  } catch (error) {
    console.error('Error (update):', error);
    res.status(500).send('Error (update)');
  }
});


// SE KONTO
app.post('/view_user', async (req, res) => {
  try {
    const users = await prisma.user.findMany(); // Få tag på alla konton från databasen med metoden 'findMany'

    let userHTML = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>View Users</title>
        <link rel="stylesheet" href="../css/view_user.css">
      </head>
      <body>
        <div id="user-list">`;

    users.forEach(user => {
      userHTML += `<div class="user">
          <h2>${user.userName}</h2>
          <img src="/uploads/${user.image}" alt="Portrait" width="100" height="100">
          <p>${user.email}</p>
          <p>${user.telephone}</p>
        </div>`;
    });

    userHTML += `</div>
      </body>
      </html>`;

    res.send(userHTML); // Skicka tillbaka formen till klient
  } catch (error) {
    console.error('Error (view):', error);
    res.status(500).send('Error fetching user information');
  }
});


// RADERA KONTO
app.post('/delete_user', async (req, res) => {
  const userToDelete = req.body.username;

  try {
    const user = await prisma.user.findUnique({ // Se ifall den finns (sök)
      where: {
        userName: userToDelete,
      },
    });

    // Använd 'delete' metoden (sista CRUD operationen) för att radera önskad användare
    if (user) {
      const deletedUser = await prisma.user.delete({
        where: {
          userName: userToDelete,
        },
      });

      notifier.notify({
        title: 'Användare raderad!',
        message: `${userToDelete} har raderats.`,
        icon: path.join(__dirname, '/img/check.jpg'),
      });

      res.redirect('/index.html');
    } else {
      notifier.notify({
        title: 'Fel!',
        message: 'Kunde inte hitta användaren för att radera.',
        icon: path.join(__dirname, '/img/cross.png'),
      });
    }
  } catch (error) {
    console.error('Error (delete):', error);
    res.status(500).send('Error (delete)');
  }
});
