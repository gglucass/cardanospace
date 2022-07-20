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

0. Create an account on https://blockfrost.io/ and https://aws.amazon.com/s3/
1. Provision a new server with at least 16GB of ram on a VPS of your choosing - we use https://www.digitalocean.com/
2. Download this repository to your server
3. Install ruby 3.0.1 or higher on your server using https://github.com/rbenv/rbenv
4. Install libcurl using `sudo apt-get install libcurl4-openssl-dev`
5. Install vips using `sudo apt install libvips-tools`
6. Increase the maximum number of files you can have open by running `ulimit -n 4096`
7. Then follow the steps below to initiate your CardanoSpace updating backend

### Configuring your backend
1. Configure the BLOCKFROST_API and BLOCKFROST_SUBDOMAIN in `.env.local`
2. Configure the AWS_KEYS in `.env.local`
3. Rename `.env.local` to `.env`
4. Run `bundle` inside the `backend` folder
5. Run `bundle exec rake db:create`
6. Run `bundle exec rake db:migrate`
7. Run `bundle exec rake db:seed`
8. Run `bundle exec racksh --updating=true --init=true` to:
  1. initiate downloading all the images shown on CardanoSpace.
  2. Create and upload the image tiles that make up CardanoSpace to your AWS S3 bucket
  3. Start a never ending loop that updates your CardanoSpace database
  4. This will take a very long time to run, as in at least 3 hours, so go eat a pizza :-)
  5. **Note:** if you run into memory issues here, you may need a beefier server.
9. `something that runs an actual space creator as part of this --> maybe with a timed loop? or if there actually is a change?`
10. Check out your newly mirrored CardanoSpace in your bucket


## #3 putting it all together

1. Take the link of the bucket and put it in the frontend file
2. Your CardanoSpace frontend now runs on a mirror of the data on the Cardano database 🥳!