# CardanoSpace goes open source

This repository contains everything to create a mirror of https://cardanospace.com

To get a mirror running, you will need to deploy 3 separate repositories:
1. A frontend that shows CardanoSpace content
2. A space creator that (a) gets all information from the blockchain and then (b) prepares a giant image of the entirety of CardanoSpace
3. An uploader that helps people submit new data to the blockchain (optional)

## #1 Frontend

1. Download the repository
2. Create an account on https://netlify.app/
3. Go to Netlify's manual deploy page https://app.netlify.com/drop
4. Drop the frontend folder in the interface
5. Wait for it to deploy
6. Visit your newly deployed CardanoSpace frontend (example: https://profound-caramel-c227a8.netlify.app/ )

## #2 Backend

1. Configure the BLOCKFROST_API and BLOCKFROST_SUBDOMAIN in `app.rb`
2. Configure the AWS_KEYS in `app.rb`
3. Run `bundle`
4. Run `bundle exec rake db:create`
5. Run `bundle exec rake db:migrate`
6. Run `bundle exec rake db:seed`
7. Run `something that pulls data`
8. Run `bundle exec racksh` to start a never ending loop that updates your CardanoSpace mirror
9. Check out your newly mirrored CardanoSpace in your bucket


## #3 putting it all together

1. Take the link of the bucket and put it in the frontend file
2. Your CardanoSpace frontend now runs on a mirror of the data on the Cardano database 🥳!