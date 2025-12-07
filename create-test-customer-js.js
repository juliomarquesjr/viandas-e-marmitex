const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'teste@mobile.com';
    const password = '123';
    const hashedPassword = await bcrypt.hash(password, 10);

    let customer = await prisma.customer.findFirst({
        where: { email }
    });

    if (!customer) {
        console.log('Criando cliente de teste...');
        customer = await prisma.customer.create({
            data: {
                name: 'Cliente Teste Mobile',
                email,
                phone: '11999999999',
                password: hashedPassword,
                doc: '123.456.789-00',
                address: {
                    street: 'Rua Teste',
                    number: '123',
                    city: 'São Paulo',
                    state: 'SP'
                }
            }
        });
        console.log('Cliente criado!');
    } else {
        console.log('Cliente de teste já existe. Atualizando senha...');
        await prisma.customer.update({
            where: { id: customer.id },
            data: { password: hashedPassword }
        });
        console.log('Senha atualizada!');
    }

    console.log(`Login: ${email}`);
    console.log(`Senha: ${password}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
